
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
const CORESIGNAL_JWT_TOKEN = Deno.env.get("CORESIGNAL_JWT_TOKEN") || "";

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

    // -------- TOKEN HANDLING DIAGNOSTIC LOGS ---------
    // Get the token from environment variables
    console.log("Environment variable CORESIGNAL_JWT_TOKEN length:", CORESIGNAL_JWT_TOKEN.length);
    console.log("Environment variable CORESIGNAL_JWT_TOKEN first few chars:", CORESIGNAL_JWT_TOKEN.substring(0, 5) + "...");
    
    // Check if environment variable token is defined
    if (!CORESIGNAL_JWT_TOKEN) {
      console.error("Error: CORESIGNAL_JWT_TOKEN is not configured in environment");
      return new Response(
        JSON.stringify({ error: "CORESIGNAL_JWT_TOKEN is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clean the token - remove any leading/trailing whitespace
    const cleanToken = CORESIGNAL_JWT_TOKEN.trim();
    console.log("Token first 10 chars (after trim):", cleanToken.substring(0, 10) + "...");
    console.log("Token length (after trim):", cleanToken.length);
    
    // Hardcoding the expected token for comparison
    const expectedToken = "Vn3B3cCbbWVfOffJiYVAZqWgcGH6tARI";
    console.log("Expected token first 10 chars:", expectedToken.substring(0, 10) + "...");
    console.log("Expected token length:", expectedToken.length);
    
    // Check if the tokens match
    const tokensMatch = cleanToken === expectedToken;
    console.log("Do tokens match?", tokensMatch);
    console.log("Using token for API calls:", cleanToken);

    // Use the expected token directly for testing
    const tokenToUse = expectedToken;
    console.log("Token being used for API call:", tokenToUse);

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
      'apikey': tokenToUse,
      'Content-Type': 'application/json'
    };
    console.log("Request headers:", JSON.stringify(searchHeaders));
    
    // Log the token values safely
    console.log("Authorization header value:", searchHeaders.apikey || "Not set");
    console.log("Token in Authorization header:", searchHeaders.apikey || "None");

    // Log the full request details
    console.log("Search Request details:", {
      method: 'POST',
      url: 'https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl',
      headers: searchHeaders,
      body: searchQuery
    });

    const searchResponse = await fetch('https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl', {
      method: 'POST',
      headers: searchHeaders,
      body: JSON.stringify(searchQuery)
    });

    // Log detailed information about the search response
    console.log("Search response status:", searchResponse.status);
    console.log("Search response status text:", searchResponse.statusText);
    console.log("Search response headers:", JSON.stringify(Object.fromEntries(searchResponse.headers.entries())));
    
    // If response is not ok, try to get more error details
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Search API error:", searchResponse.status, errorText);
      
      // Try to parse response as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error("Error JSON:", JSON.stringify(errorJson));
      } catch (e) {
        console.error("Error is not in JSON format");
      }
      
      // Check for specific error codes
      if (searchResponse.status === 401) {
        console.error("Authentication failed (401 Unauthorized) - Token may be invalid or expired");
        console.error("Token used:", tokenToUse);
      } else if (searchResponse.status === 403) {
        console.error("Authorization failed (403 Forbidden) - Token may not have access to this resource");
      } else if (searchResponse.status === 429) {
        console.error("Rate limit exceeded (429 Too Many Requests)");
      }
      
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
          query: searchQuery,
          token_details: {
            used: tokenToUse.substring(0, 5) + "...",
            length: tokenToUse.length,
            bearer_header: `Bearer ${tokenToUse.substring(0, 5)}...`
          }
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
      'apikey': tokenToUse,
      'Content-Type': 'application/json'
    };
    console.log("Details request headers:", JSON.stringify(detailsHeaders));
    console.log("Authorization header for details request:", detailsHeaders.apikey);

    // Log the full details request
    console.log("Details Request details:", {
      method: 'GET',
      url: detailsUrl,
      headers: detailsHeaders
    });

    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: detailsHeaders
    });

    // Log detailed information about the details response
    console.log("Details response status:", detailsResponse.status);
    console.log("Details response status text:", detailsResponse.statusText);
    console.log("Details response headers:", JSON.stringify(Object.fromEntries(detailsResponse.headers.entries())));

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error("Details API error:", detailsResponse.status, errorText);
      
      // Try to parse response as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error("Error JSON:", JSON.stringify(errorJson));
      } catch (e) {
        console.error("Error is not in JSON format");
      }
      
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
          detailsUrl: detailsUrl,
          token_details: {
            used: tokenToUse.substring(0, 5) + "...",
            length: tokenToUse.length,
            bearer_header: `Bearer ${tokenToUse.substring(0, 5)}...`
          }
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
