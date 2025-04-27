
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
const CORESIGNAL_API_KEY = Deno.env.get("CORESIGNAL_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Function to validate the API key
async function validateApiKey(apiKey: string): Promise<{ isValid: boolean; message: string }> {
  console.log("Validating API key...");
  
  if (!apiKey || apiKey.trim() === "") {
    console.error("API key is empty or not provided");
    return { isValid: false, message: "API key is empty or not provided" };
  }
  
  // Test the API key with a simple API call
  try {
    console.log("Testing API key with API call...");
    const testResponse = await fetch('https://api.coresignal.com/cdapi/v1/token/check', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });
    
    console.log(`API key test response status: ${testResponse.status}`);
    console.log(`API key test response headers: ${JSON.stringify(Object.fromEntries(testResponse.headers.entries()))}`);
    
    // Try to get the response body
    let responseText;
    try {
      responseText = await testResponse.text();
      console.log(`API key test response body: ${responseText}`);
    } catch (error) {
      console.log(`Error getting response text: ${error.message}`);
    }
    
    if (testResponse.status === 401) {
      return { 
        isValid: false, 
        message: `API key rejected by Coresignal API (401 Unauthorized). Response: ${responseText || "No response body"}` 
      };
    }
    
    if (!testResponse.ok) {
      return { 
        isValid: false, 
        message: `API test failed with status ${testResponse.status}. Response: ${responseText || "No response body"}` 
      };
    }
    
    return { isValid: true, message: "API key valid" };
  } catch (error) {
    console.error(`Error testing API key: ${error.message}`);
    return { isValid: false, message: `Error testing API key: ${error.message}` };
  }
}

serve(async (req) => {
  // Add debugging for incoming requests
  console.log(`Received ${req.method} request to ${new URL(req.url).pathname}`);
  
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Special endpoint for API key check
  const url = new URL(req.url);
  console.log(`Processing URL: ${url.pathname}`);
  
  if (url.pathname.endsWith('/token-check')) {
    console.log("API key check requested");
    
    try {
      if (!CORESIGNAL_API_KEY) {
        console.error("Coresignal API key is missing");
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            message: "CORESIGNAL_API_KEY environment variable is not set" 
          }),
          {
            status: 200, // Return 200 even for token issues so client can display the message
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Log API key details for debugging (safely)
      const keyLength = CORESIGNAL_API_KEY.length;
      const keyStart = CORESIGNAL_API_KEY.substring(0, 10);
      const keyEnd = CORESIGNAL_API_KEY.substring(CORESIGNAL_API_KEY.length - 10);
      console.log(`API key starts with: ${keyStart}... ends with: ...${keyEnd}`);
      console.log(`API key length: ${keyLength}`);
      
      const keyValidation = await validateApiKey(CORESIGNAL_API_KEY);
      console.log(`API key validation result: ${JSON.stringify(keyValidation)}`);
      
      return new Response(
        JSON.stringify({ 
          isValid: keyValidation.isValid, 
          message: keyValidation.message,
          keyLength: keyLength,
          keyStartsWith: keyStart + "...",
          keyEndsWith: "..." + keyEnd
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(`Unexpected error in API key check: ${error.message}`);
      console.error(error.stack || "No stack trace available");
      
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: `Unexpected error: ${error.message}`,
          errorStack: error.stack || "No stack trace available"
        }),
        {
          status: 200, // Return 200 even for errors so client can display the message
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  try {
    // Handle the case where request body might be empty
    let jsonBody;
    try {
      const bodyText = await req.text();
      console.log(`Request body text length: ${bodyText.length}`);
      if (bodyText.trim() === "") {
        console.log("Request body is empty, using empty object");
        jsonBody = {};
      } else {
        console.log(`First 100 chars of request body: ${bodyText.substring(0, 100)}`);
        jsonBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error(`Error parsing request body: ${parseError.message}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: parseError.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const linkedInUrl = jsonBody.linkedInUrl;
    
    if (!linkedInUrl) {
      console.error("LinkedIn URL is missing from request");
      return new Response(
        JSON.stringify({ error: "LinkedIn URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing LinkedIn URL:", linkedInUrl);

    // First validate the API key before making any API calls
    if (!CORESIGNAL_API_KEY) {
      console.error("Coresignal API key is missing");
      return new Response(
        JSON.stringify({ 
          error: "Coresignal API key is missing",
          details: "The CORESIGNAL_API_KEY environment variable is not set or is empty",
          resolution: "Please set the CORESIGNAL_API_KEY in your Supabase Edge Function secrets"
        }),
        {
          status: 200, // Return 200 even for key issues so client can display the message
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const keyValidation = await validateApiKey(CORESIGNAL_API_KEY);
    if (!keyValidation.isValid) {
      console.error(`Coresignal API key is invalid: ${keyValidation.message}`);
      return new Response(
        JSON.stringify({ 
          error: "Coresignal API key is invalid",
          details: keyValidation.message,
          resolution: "Please update the CORESIGNAL_API_KEY in your Supabase Edge Function secrets with a valid key"
        }),
        {
          status: 200, // Return 200 even for key issues so client can display the message
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
    
    // Log the key being used (safely)
    const keyStart = CORESIGNAL_API_KEY.substring(0, 10);
    const keyEnd = CORESIGNAL_API_KEY.substring(CORESIGNAL_API_KEY.length - 10);
    console.log(`Using API key starting with: ${keyStart}... ending with: ...${keyEnd}`);
    
    // Add retries for the search request
    let searchResponse = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        console.log(`Search attempt ${4-retries}, sending request to Coresignal API`);
        searchResponse = await fetch('https://api.coresignal.com/cdapi/v1/multi_source/company/search/es_dsl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CORESIGNAL_API_KEY}`,
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
          error_message: `Coresignal API authentication failed (401): API key may be invalid or expired. Response: ${errorText}`,
          search_query: searchQuery
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal API authentication failed (401)`,
          message: `The API key used for authentication appears to be invalid or expired. Please update the CORESIGNAL_API_KEY in your Supabase Edge Function secrets.`,
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
        console.log(`Details attempt ${4-retries}, sending request to Coresignal API`);
        detailsResponse = await fetch(detailsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CORESIGNAL_API_KEY}`,
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
          error_message: `Coresignal Details API authentication failed (401): API key may be invalid or expired`
        })
        .eq('id', dbEntry.id);
      
      return new Response(
        JSON.stringify({ 
          error: `Coresignal Details API authentication failed (401)`,
          message: `The API key used for authentication appears to be invalid or expired. Please update the CORESIGNAL_API_KEY in your Supabase Edge Function secrets.`,
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
    console.error(error.stack || "No stack trace available");
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process request",
        details: error.message || String(error),
        stack: error.stack || "No stack trace available"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
