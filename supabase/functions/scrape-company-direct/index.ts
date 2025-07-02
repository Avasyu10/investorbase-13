
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests - comprehensive header allowlist
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// CoreSignal API configuration
const CORESIGNAL_SEARCH_URL = "https://api.coresignal.com/cdapi/v2/company_multi_source/search/es_dsl";
const CORESIGNAL_COLLECT_URL = "https://api.coresignal.com/cdapi/v2/company_multi_source/collect";
const CORESIGNAL_API_KEY = "yIKsZwEQOwJk0xd2ZN2lBgDYCn2mk2ej";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log("Request received by scrape-company-direct function");
    console.log("Request method:", req.method);
    
    // Parse request data
    let reqData;
    try {
      const bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (bodyText) {
        reqData = JSON.parse(bodyText);
      } else {
        throw new Error("Empty request body");
      }
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
    console.log("Extracted linkedInUrl:", linkedInUrl);
    
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

    // Validate that it's a LinkedIn company URL (not a CoreSignal API URL)
    const isLinkedInCompanyUrl = cleanUrl.includes('linkedin.com/company/');
    
    if (!isLinkedInCompanyUrl) {
      console.error("Invalid LinkedIn company URL format:", cleanUrl);
      return new Response(
        JSON.stringify({ 
          error: "Invalid LinkedIn company URL format. Please provide a valid LinkedIn company URL like: https://www.linkedin.com/company/example-company/",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    try {
      console.log("Step 1: Making POST request to CoreSignal search API");
      
      // Step 1: POST request to search for the company
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
      
      // Make the first request to CoreSignal API
      const searchResponse = await fetch(CORESIGNAL_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CORESIGNAL_API_KEY
        },
        body: JSON.stringify(searchPayload)
      });

      console.log("CoreSignal search response status:", searchResponse.status);
      console.log("CoreSignal search response headers:", Object.fromEntries(searchResponse.headers.entries()));
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`CoreSignal search API error (${searchResponse.status}): ${errorText}`);
        throw new Error(`CoreSignal search API error: ${searchResponse.status} - ${errorText}`);
      }

      const searchData = await searchResponse.json();
      console.log("CoreSignal search response:", JSON.stringify(searchData, null, 2));

      // Extract the ID from the search response
      let collectId = null;
      if (Array.isArray(searchData) && searchData.length > 0) {
        collectId = searchData[0];
      } else if (searchData && searchData.hits && searchData.hits.hits && searchData.hits.hits.length > 0) {
        // Handle different response format if needed
        collectId = searchData.hits.hits[0]._id || searchData.hits.hits[0].id;
      }

      if (!collectId) {
        console.log("No ID found in search response, trying alternative search strategies");
        
        // Try searching without quotes
        const alternativeSearchPayload = {
          query: {
            bool: {
              must: [
                {
                  query_string: {
                    default_field: "linkedin_url",
                    query: cleanUrl
                  }
                }
              ]
            }
          }
        };

        console.log("Trying alternative search:", JSON.stringify(alternativeSearchPayload, null, 2));
        
        const alternativeResponse = await fetch(CORESIGNAL_SEARCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CORESIGNAL_API_KEY
          },
          body: JSON.stringify(alternativeSearchPayload)
        });

        if (alternativeResponse.ok) {
          const alternativeData = await alternativeResponse.json();
          console.log("Alternative search response:", JSON.stringify(alternativeData, null, 2));
          
          if (Array.isArray(alternativeData) && alternativeData.length > 0) {
            collectId = alternativeData[0];
          } else if (alternativeData && alternativeData.hits && alternativeData.hits.hits && alternativeData.hits.hits.length > 0) {
            collectId = alternativeData.hits.hits[0]._id || alternativeData.hits.hits[0].id;
          }
        }
      }

      if (!collectId) {
        console.log("No company ID found in CoreSignal search response");
        throw new Error("Company not found in CoreSignal database. The LinkedIn URL may not be indexed yet.");
      }

      console.log("Step 2: Making GET request to collect company data with ID:", collectId);

      // Step 2: GET request to collect the actual company data
      const collectUrl = `${CORESIGNAL_COLLECT_URL}/${collectId}`;
      const collectResponse = await fetch(collectUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CORESIGNAL_API_KEY
        }
      });

      console.log("CoreSignal collect response status:", collectResponse.status);

      if (!collectResponse.ok) {
        const errorText = await collectResponse.text();
        console.error(`CoreSignal collect API error (${collectResponse.status}): ${errorText}`);
        throw new Error(`CoreSignal collect API error: ${collectResponse.status} - ${errorText}`);
      }

      const companyData = await collectResponse.json();
      console.log("CoreSignal collect response:", JSON.stringify(companyData, null, 2));

      // Extract and format the company information
      if (companyData && companyData.id) {
        console.log("Successfully retrieved company data from CoreSignal");
        
        // Parse employee count - handle ranges like "10001-50000" and actual numbers
        let employeeCount = null;
        if (companyData.employees_count) {
          if (typeof companyData.employees_count === 'number') {
            employeeCount = companyData.employees_count;
          } else if (typeof companyData.employees_count === 'string' && companyData.employees_count.includes('-')) {
            employeeCount = companyData.employees_count; // Keep the range as string
          } else {
            employeeCount = parseInt(companyData.employees_count) || companyData.employees_count;
          }
        } else if (companyData.size_range) {
          employeeCount = companyData.size_range;
        }

        // Parse founded year
        let foundedYear = null;
        if (companyData.founded_year) {
          foundedYear = companyData.founded_year.toString();
        } else if (companyData.founded_date) {
          foundedYear = new Date(companyData.founded_date).getFullYear().toString();
        }

        // Extract location - prioritize hq_full_address over other location fields
        let location = null;
        let hqFullAddress = null;
        
        if (companyData.hq_full_address) {
          hqFullAddress = companyData.hq_full_address;
          location = companyData.hq_location || companyData.hq_city;
        } else if (companyData.hq_location) {
          location = companyData.hq_location;
        } else if (companyData.location) {
          location = companyData.location;
        } else if (companyData.headquarters) {
          location = companyData.headquarters;
        } else if (companyData.address) {
          location = companyData.address;
        }

        // Extract social media URLs - handle array format
        let facebookUrl = null;
        let instagramUrl = null;
        
        if (companyData.facebook_url && Array.isArray(companyData.facebook_url) && companyData.facebook_url.length > 0) {
          facebookUrl = companyData.facebook_url;
        }
        
        if (companyData.instagram_url && Array.isArray(companyData.instagram_url) && companyData.instagram_url.length > 0) {
          instagramUrl = companyData.instagram_url;
        }

        console.log("Extracted social media data:", {
          facebook_url: facebookUrl,
          instagram_url: instagramUrl,
          hq_full_address: hqFullAddress
        });

        // Format the scraped data
        const scrapedData = {
          name: companyData.company_name || companyData.company_legal_name || companyData.name || "Company Name Not Available",
          description: companyData.description || companyData.about || "No description available",
          founded_year: foundedYear,
          employees_count: employeeCount,
          industry: companyData.industry || (companyData.industries && companyData.industries[0]) || null,
          location: location,
          website: companyData.website || companyData.website_url || null,
          linkedin_url: cleanUrl,
          facebook_url: facebookUrl,
          instagram_url: instagramUrl,
          hq_full_address: hqFullAddress
        };
        
        console.log("Company data extracted successfully:", JSON.stringify(scrapedData, null, 2));

        return new Response(
          JSON.stringify({ 
            success: true,
            data: scrapedData,
            message: "Company information retrieved successfully"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      } else {
        console.log("No valid company data found in CoreSignal response");
        throw new Error("No valid company data found in response");
      }

    } catch (error) {
      console.error("CoreSignal API error:", error.message);
      
      // Create fallback data on API error
      const urlParts = cleanUrl.split('/');
      let companySlug = "";
      
      // Extract company slug from LinkedIn URL
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'company' && i + 1 < urlParts.length) {
          companySlug = urlParts[i + 1];
          break;
        }
      }
      
      const fallbackData = {
        name: companySlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Company",
        description: `Unable to retrieve detailed information from CoreSignal API. Error: ${error.message}`,
        founded_year: null,
        employees_count: null,
        industry: null,
        location: null,
        website: null,
        linkedin_url: cleanUrl,
        facebook_url: null,
        instagram_url: null,
        hq_full_address: null
      };

      return new Response(
        JSON.stringify({ 
          success: false,
          data: fallbackData,
          error: error.message,
          message: "Failed to retrieve company data from CoreSignal API"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Return 200 but with success: false
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
