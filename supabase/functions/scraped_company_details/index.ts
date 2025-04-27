
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

// Function to validate the JWT token
async function validateToken(token: string): Promise<{ isValid: boolean; message: string }> {
  console.log("Validating JWT token...");
  
  // Basic format check
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error("JWT token has invalid format - should have 3 parts");
    return { isValid: false, message: "JWT token has invalid format - should have 3 parts" };
  }
  
  // Test the token with a simple API call
  try {
    console.log("Testing token with API call...");
    const testResponse = await fetch('https://api.coresignal.com/cdapi/v1/token/check', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    console.log(`Token test response status: ${testResponse.status}`);
    console.log(`Token test response headers: ${JSON.stringify(Object.fromEntries(testResponse.headers.entries()))}`);
    
    // Try to get the response body
    let responseText;
    try {
      responseText = await testResponse.text();
      console.log(`Token test response body: ${responseText}`);
    } catch (error) {
      console.log(`Error getting response text: ${error.message}`);
    }
    
    if (testResponse.status === 401) {
      return { 
        isValid: false, 
        message: `Token rejected by Coresignal API (401 Unauthorized). Response: ${responseText || "No response body"}` 
      };
    }
    
    if (!testResponse.ok) {
      return { 
        isValid: false, 
        message: `API test failed with status ${testResponse.status}. Response: ${responseText || "No response body"}` 
      };
    }
    
    return { isValid: true, message: "Token valid" };
  } catch (error) {
    console.error(`Error testing token: ${error.message}`);
    return { isValid: false, message: `Error testing token: ${error.message}` };
  }
}

serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Special endpoint for token check
  const url = new URL(req.url);
  if (url.pathname.endsWith('/token-check')) {
    console.log("Token check requested");
    
    if (!CORESIGNAL_JWT_TOKEN) {
      console.error("Coresignal JWT token is missing");
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: "CORESIGNAL_JWT_TOKEN environment variable is not set" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Log first and last few characters of the token for debugging
    const tokenStart = CORESIGNAL_JWT_TOKEN.substring(0, 10);
    const tokenEnd = CORESIGNAL_JWT_TOKEN.substring(CORESIGNAL_JWT_TOKEN.length - 10);
    console.log(`Token starts with: ${tokenStart}... ends with: ...${tokenEnd}`);
    console.log(`Token length: ${CORESIGNAL_JWT_TOKEN.length}`);
    
    const tokenValidation = await validateToken(CORESIGNAL_JWT_TOKEN);
    
    if (!tokenValidation.isValid) {
      console.error(`Coresignal JWT token has invalid format: ${tokenValidation.message}`);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: tokenValidation.message,
          tokenLength: CORESIGNAL_JWT_TOKEN.length,
          tokenStartsWith: tokenStart + "...",
          tokenEndsWith: "..." + tokenEnd
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        message: "Token is valid" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse the request to get the LinkedIn URL
    const { linkedInUrl } = await req.json();
    
    if (!linkedInUrl) {
      return new Response(
        JSON.stringify({ error: "LinkedIn URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing LinkedIn URL:", linkedInUrl);

    // First validate the token before making any API calls
    if (!CORESIGNAL_JWT_TOKEN) {
      console.error("Coresignal JWT token is missing");
      return new Response(
        JSON.stringify({ 
          error: "Coresignal JWT token is missing",
          details: "The CORESIGNAL_JWT_TOKEN environment variable is not set or is empty",
          resolution: "Please set the CORESIGNAL_JWT_TOKEN in your Supabase Edge Function secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const tokenValidation = await validateToken(CORESIGNAL_JWT_TOKEN);
    if (!tokenValidation.isValid) {
      console.error(`Coresignal JWT token is invalid: ${tokenValidation.message}`);
      return new Response(
        JSON.stringify({ 
          error: "Coresignal JWT token is invalid",
          details: tokenValidation.message,
          resolution: "Please update the CORESIGNAL_JWT_TOKEN in your Supabase Edge Function secrets with a valid token"
        }),
        {
          status: 401,
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
    
    // Log the token being used (safely)
    const tokenStart = CORESIGNAL_JWT_TOKEN.substring(0, 10);
    const tokenEnd = CORESIGNAL_JWT_TOKEN.substring(CORESIGNAL_JWT_TOKEN.length - 10);
    console.log(`Using token starting with: ${tokenStart}... ending with: ...${tokenEnd}`);
    
    // Add retries for the search request
    let searchResponse = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        searchResponse = await fetch('https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchQuery)
        });
        
        // Log detailed information about the search response
        console.log("Search response status:", searchResponse.status);
        console.log("Search response headers:", JSON.stringify(Object.fromEntries(searchResponse.headers.entries())));
        
        break; // If no exception, break the retry loop
      } catch (fetchError) {
        console.error(`Search fetch attempt ${4-retries} failed:`, fetchError);
        retries--;
        
        if (retries === 0) {
          // Update DB with network error
          await supabase
            .from('company_scrapes')
            .update({
              status: 'failed',
              error_message: `Network error: ${fetchError.message}`,
              search_query: searchQuery
            })
            .eq('id', dbEntry.id);
          
          return new Response(
            JSON.stringify({ 
              error: "Network error connecting to Coresignal API",
              message: fetchError.message
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Wait a bit before retrying
        await new Promise(r => setTimeout(r, 1000));
        console.log(`Retrying search request, ${retries} attempts remaining`);
      }
    }

    if (searchResponse.status === 401) {
      const errorText = await searchResponse.text();
      console.error("Search API authentication error:", searchResponse.status, errorText);
      
      // Update the database record with the auth error
      await supabase
        .from('company_scrapes')
        .update({
          status: 'failed',
          error_message: `Coresignal API authentication failed (401): JWT token may be invalid or expired. Response: ${errorText}`,
          search_query: searchQuery
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal API authentication failed (401)`,
          message: `The JWT token used for authentication appears to be invalid or expired. Please update the CORESIGNAL_JWT_TOKEN in your Supabase Edge Function secrets.`,
          details: errorText || "No additional error details provided by the API"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (!searchResponse.ok) {
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

    // Add retries for the details request too
    let detailsResponse = null;
    retries = 3;
    
    while (retries > 0) {
      try {
        detailsResponse = await fetch(detailsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Log detailed information about the details response
        console.log("Details response status:", detailsResponse.status);
        console.log("Details response headers:", JSON.stringify(Object.fromEntries(detailsResponse.headers.entries())));
        
        break; // If no exception, break the retry loop
      } catch (fetchError) {
        console.error(`Details fetch attempt ${4-retries} failed:`, fetchError);
        retries--;
        
        if (retries === 0) {
          // Update DB with network error
          await supabase
            .from('company_scrapes')
            .update({
              status: 'failed',
              error_message: `Network error fetching details: ${fetchError.message}`
            })
            .eq('id', dbEntry.id);
          
          return new Response(
            JSON.stringify({ 
              error: "Network error connecting to Coresignal Details API",
              message: fetchError.message,
              companyId: companyId
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Wait a bit before retrying
        await new Promise(r => setTimeout(r, 1000));
        console.log(`Retrying details request, ${retries} attempts remaining`);
      }
    }

    if (detailsResponse.status === 401) {
      const errorText = await detailsResponse.text();
      console.error("Details API authentication error:", detailsResponse.status, errorText);
      
      // Update the database record with the error
      await supabase
        .from('company_scrapes')
        .update({
          status: 'failed',
          error_message: `Coresignal Details API authentication failed (401): JWT token may be invalid or expired`
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal Details API authentication failed (401)`,
          message: `The JWT token used for authentication appears to be invalid or expired. Please update the CORESIGNAL_JWT_TOKEN in your Supabase Edge Function secrets.`,
          details: errorText || "No additional error details provided by the API"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (!detailsResponse.ok) {
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
