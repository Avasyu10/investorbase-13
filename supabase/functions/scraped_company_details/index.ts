
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
    // Updated API endpoint and search format
    const searchUrl = 'https://api.coresignal.com/cdapi/v1/linkedin/company/search/filter';
    const searchPayload = {
      title: "",
      website: "",
      size_from: 1,
      size_to: 100000,
      founded_year_from: 1900,
      founded_year_to: 2024,
      linkedin_url: linkedInUrl
    };

    console.log("Sending search request to:", searchUrl);
    console.log("Search payload:", JSON.stringify(searchPayload));

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchPayload)
    });

    console.log("Search response status:", searchResponse.status);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Search API error:", searchResponse.status, errorText);
      
      // Update the database record with the error
      await supabase
        .from('company_scrapes')
        .update({
          status: 'failed',
          error_message: `Search API error: ${searchResponse.status} - ${errorText}`,
          search_query: searchPayload
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal Search API error: ${searchResponse.status}`,
          message: errorText,
          query: searchPayload
        }),
        {
          status: searchResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const searchData = await searchResponse.json();
    console.log("Search API response received:", typeof searchData, Object.keys(searchData || {}).length);
    
    let companyId = null;
    
    // Check if we have results
    if (searchData && searchData.length > 0) {
      companyId = searchData[0].id;
      console.log("Found company ID:", companyId);
    } else {
      console.log("No results found for LinkedIn URL");
      
      // Update the database record with no results
      await supabase
        .from('company_scrapes')
        .update({
          status: 'no_results',
          search_query: searchPayload
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: "No company found with the provided LinkedIn URL",
          searchResponse: searchData,
          query: searchPayload
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
        search_query: searchPayload,
        company_id: companyId.toString()
      })
      .eq('id', dbEntry.id);
    
    // STEP 2: Now use the company ID to get the detailed information
    const detailsUrl = `https://api.coresignal.com/cdapi/v1/linkedin/company/collect/${companyId}`;
    console.log("Fetching company details from:", detailsUrl);

    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("Details response status:", detailsResponse.status);

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
    console.log("Details API response received:", typeof detailsData, Object.keys(detailsData || {}).length);

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
      
      // Try to update with just the status in case it's a data size/format issue
      await supabase
        .from('company_scrapes')
        .update({
          status: 'success_but_storage_error',
          error_message: `Failed to store full data: ${updateError.message}`
        })
        .eq('id', dbEntry.id);
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
