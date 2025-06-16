
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CoreSignal API configuration
const CORESIGNAL_JWT_TOKEN = Deno.env.get('CORESIGNAL_JWT_TOKEN');
const CORESIGNAL_API_KEY = Deno.env.get('CORESIGNAL_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Request received by scrape-company-direct function");
    
    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON with linkedInUrl property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { linkedInUrl } = reqData;
    
    if (!linkedInUrl) {
      console.error("Missing linkedInUrl in request");
      return new Response(
        JSON.stringify({ 
          error: "LinkedIn URL is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing LinkedIn URL: ${linkedInUrl}`);
    
    if (!CORESIGNAL_JWT_TOKEN || !CORESIGNAL_API_KEY) {
      console.error("Missing CoreSignal credentials");
      return new Response(
        JSON.stringify({ 
          error: "Missing CoreSignal API credentials",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Clean and validate the LinkedIn URL
    let cleanUrl = linkedInUrl.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    // Ensure it ends with a slash for consistency
    if (!cleanUrl.endsWith('/')) {
      cleanUrl += '/';
    }
    
    console.log(`Clean URL: ${cleanUrl}`);

    try {
      console.log("Attempting to scrape LinkedIn URL:", cleanUrl);
      
      // Step 1: Search for the company using CoreSignal
      console.log("Step 1: Making POST request to CoreSignal search API");
      
      const searchPayload = {
        query: {
          bool: {
            must: [
              {
                query_string: {
                  default_field: "linkedin_url",
                  query: `"${cleanUrl}"`
                }
              }
            ]
          }
        }
      };
      
      console.log("CoreSignal search payload:", JSON.stringify(searchPayload, null, 2));
      
      const searchResponse = await fetch('https://api.coresignal.com/cdapi/v1/linkedin/company/search/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload)
      });

      console.log("CoreSignal search response status:", searchResponse.status);
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`CoreSignal search error (${searchResponse.status}): ${errorText}`);
        throw new Error(`CoreSignal search failed: ${searchResponse.status} - ${errorText}`);
      }

      const searchResults = await searchResponse.json();
      console.log("CoreSignal search response:", JSON.stringify(searchResults, null, 2));

      if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
        console.log("No company found for the provided LinkedIn URL");
        return new Response(
          JSON.stringify({ 
            error: "No company found for the provided LinkedIn URL",
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      const companyId = searchResults[0];
      console.log(`Step 2: Making GET request to collect company data with ID: ${companyId}`);

      // Step 2: Get detailed company information
      const collectResponse = await fetch(`https://api.coresignal.com/cdapi/v1/linkedin/company/collect/${companyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
        }
      });

      console.log("CoreSignal collect response status:", collectResponse.status);
      
      if (!collectResponse.ok) {
        const errorText = await collectResponse.text();
        console.error(`CoreSignal collect error (${collectResponse.status}): ${errorText}`);
        throw new Error(`CoreSignal collect failed: ${collectResponse.status} - ${errorText}`);
      }

      const companyData = await collectResponse.json();
      console.log("CoreSignal collect response:", JSON.stringify(companyData, null, 2));

      if (!companyData) {
        throw new Error("No company data received from CoreSignal");
      }

      console.log("Successfully retrieved company data from CoreSignal");

      // Extract essential company information
      const extractedData = {
        name: companyData.company_name || companyData.name || null,
        description: companyData.description || null,
        founded_year: companyData.founded_year || null,
        employees_count: companyData.employees_count || null,
        industry: companyData.industry || null,
        location: companyData.hq_location || companyData.hq_city || null,
        website: companyData.website || null,
        linkedin_url: companyData.linkedin_url || cleanUrl
      };

      console.log("Essential company data extracted:", JSON.stringify(extractedData, null, 2));

      return new Response(
        JSON.stringify({ 
          success: true,
          data: extractedData,
          message: "Company information successfully retrieved from LinkedIn"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (error) {
      console.error(`Error processing LinkedIn URL ${cleanUrl}:`, error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred while scraping',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

  } catch (error) {
    console.error("Error in scrape-company-direct function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
