
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Supabase client initialization with service role key
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Use the hard-coded token instead of environment variable
const CORESIGNAL_JWT_TOKEN = "maLVe60a86gZJQuIrmvTs5DGxOvBg69k";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Request received by scraped_company_details function");
    
    // Parse the request to get the LinkedIn URL
    const { linkedInUrl } = await req.json();
    
    if (!linkedInUrl) {
      console.error("Error: LinkedIn URL is required");
      return new Response(
        JSON.stringify({ error: "LinkedIn URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing LinkedIn URL:", linkedInUrl);

    // Check if token is properly defined
    if (!CORESIGNAL_JWT_TOKEN) {
      console.error("Error: CORESIGNAL_JWT_TOKEN is not configured");
      return new Response(
        JSON.stringify({ error: "CORESIGNAL_JWT_TOKEN is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the token we're using for debugging
    console.log("Token first 10 chars:", CORESIGNAL_JWT_TOKEN.substring(0, 10) + "...");
    console.log("Token length:", CORESIGNAL_JWT_TOKEN.length);

    // Start by creating a record in the database
    const { data: dbEntry, error: insertError } = await supabase
      .from('company_scrapes')
      .insert({
        linkedin_url: linkedInUrl,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting initial record:", insertError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create database record",
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // STEP 1: First make the search request to get the company ID
    const searchQuery = {
      "query": {
        "bool": {
          "must": [
            {
              "query_string": {
                "default_field": "linkedin_url",
                "query": `"${linkedInUrl}"`
              }
            }
          ]
        }
      }
    };

    console.log("Sending search query to Coresignal API:", JSON.stringify(searchQuery));
    console.log("API endpoint: https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl");

    // Prepare headers for debugging
    const searchHeaders = {
      'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
    console.log("Request headers:", JSON.stringify(searchHeaders));

    const searchResponse = await fetch('https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl', {
      method: 'POST',
      headers: searchHeaders,
      body: JSON.stringify(searchQuery)
    });

    // Log detailed information about the search response
    console.log("Search response status:", searchResponse.status);
    console.log("Search response headers:", JSON.stringify(Object.fromEntries(searchResponse.headers.entries())));
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Search API error:", searchResponse.status, errorText);
      
      // Update the database record with the error
      await supabase
        .from('company_scrapes')
        .update({
          status: 'failed',
          error_message: `Search API error: ${searchResponse.status} - ${errorText}`,
          search_query: searchQuery
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal Search API error: ${searchResponse.status}`,
          message: errorText,
          query: searchQuery
        }),
        {
          status: searchResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the response text first to examine it
    const searchText = await searchResponse.text();
    console.log("Search API complete response:", searchText);
    
    let companyId = null;
    
    // Check if response is a direct ID in square brackets like [9073671]
    if (searchText.startsWith('[') && searchText.endsWith(']')) {
      // Extract the number from between the brackets
      companyId = searchText.substring(1, searchText.length - 1);
      console.log("Found company ID in direct format:", companyId);
    } 
    else {
      // Try to parse as JSON for other formats
      try {
        const searchData = JSON.parse(searchText);
        console.log("Search data type:", typeof searchData);
        
        // Check for data at top level
        if (searchData.data && Array.isArray(searchData.data) && searchData.data.length > 0) {
          companyId = searchData.data[0].id;
          console.log("Found company ID at top level:", companyId);
        } 
        // Check traditional hits structure
        else if (searchData.hits && searchData.hits.hits && searchData.hits.hits.length > 0) {
          companyId = searchData.hits.hits[0]._id;
          console.log("Found company ID in traditional hits structure:", companyId);
        }
      } catch (parseError) {
        console.error("Error parsing search response as JSON:", parseError);
      }
    }
    
    // If no company ID was found, return an error
    if (!companyId) {
      console.log("No results found in any expected format");
      
      // Update the database record with the no results found
      await supabase
        .from('company_scrapes')
        .update({
          status: 'no_results',
          search_query: searchQuery
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: "No company found with the provided LinkedIn URL",
          searchResponse: searchText,
          query: searchQuery
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Update the database with the company ID
    await supabase
      .from('company_scrapes')
      .update({
        search_query: searchQuery,
        company_id: companyId
      })
      .eq('id', dbEntry.id);
    
    // STEP 2: Now use the company ID to get the detailed information
    const detailsUrl = `https://api.coresignal.com/cdapi/v1/multi_source/company/collect/${companyId}`;
    console.log("Fetching company details from:", detailsUrl);

    // Prepare headers for debugging
    const detailsHeaders = {
      'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    };
    console.log("Details request headers:", JSON.stringify(detailsHeaders));

    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: detailsHeaders
    });

    // Log detailed information about the details response
    console.log("Details response status:", detailsResponse.status);
    console.log("Details response headers:", JSON.stringify(Object.fromEntries(detailsResponse.headers.entries())));

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error("Details API error:", detailsResponse.status, errorText);
      
      // Update the database record with the error
      await supabase
        .from('company_scrapes')
        .update({
          status: 'failed',
          error_message: `Details API error: ${detailsResponse.status} - ${errorText}`
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal Details API error: ${detailsResponse.status}`,
          message: errorText,
          companyId: companyId,
          detailsUrl: detailsUrl
        }),
        {
          status: detailsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const detailsData = await detailsResponse.json();
    console.log("Details API response received:", typeof detailsData, Object.keys(detailsData).length);
    
    // DEBUG: Log a sample of the response to verify the structure
    console.log("Details data sample:", JSON.stringify(detailsData).substring(0, 500) + "...");

    // Store the result in the database
    const { error: updateError } = await supabase
      .from('company_scrapes')
      .update({
        scraped_data: detailsData,
        status: 'success'
      })
      .eq('id', dbEntry.id);

    if (updateError) {
      console.error("Error updating database with scraped data:", updateError);
      
      // Attempt to log more details about the error and data
      console.log("Details data type:", typeof detailsData);
      console.log("Update error details:", JSON.stringify(updateError));
      
      // Try to update with just the status in case it's a data size/format issue
      const { error: fallbackError } = await supabase
        .from('company_scrapes')
        .update({
          status: 'success_but_storage_error',
          error_message: `Failed to store full data: ${updateError.message}`
        })
        .eq('id', dbEntry.id);
        
      if (fallbackError) {
        console.error("Even fallback update failed:", fallbackError);
      }
    } else {
      console.log("Scrape data saved to database");
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId: companyId,
        companyData: detailsData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process request",
        details: error.message || String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
