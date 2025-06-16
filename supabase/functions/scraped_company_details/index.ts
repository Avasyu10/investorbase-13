
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CoreSignal API configuration
const CORESIGNAL_API_URL = "https://api.coresignal.com/cdapi/v2/company_multi_source/search/es_dsl";
const CORESIGNAL_API_KEY = "xm2kAqJbIZDVjE877BKO72AO00XNBaEk";

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
    
    // Parse the request to get the LinkedIn URL and optional company ID
    const { linkedInUrl, companyId } = await req.json();
    
    if (!linkedInUrl) {
      console.log("LinkedIn URL is required");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "LinkedIn URL is required",
          message: "No LinkedIn URL provided"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing LinkedIn URL:", linkedInUrl, "for company ID:", companyId);

    // Create a record in the database
    const insertData: any = {
      linkedin_url: linkedInUrl,
      status: 'processing'
    };

    // Include company_id if provided
    if (companyId) {
      insertData.company_id = companyId;
    }

    const { data: dbEntry, error: insertError } = await supabase
      .from('company_scrapes')
      .insert(insertData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.log("Database insert issue:", insertError.message);
    }

    // Try to scrape LinkedIn using CoreSignal API
    let scrapedData = null;
    let errorMessage = null;

    try {
      console.log("Attempting to scrape LinkedIn URL:", linkedInUrl);
      
      // Clean the LinkedIn URL
      const cleanUrl = linkedInUrl.trim();
      console.log("Clean URL:", cleanUrl);
      
      // Validate that it's a company URL
      const isCompanyUrl = cleanUrl.includes('/company/');
      
      if (!isCompanyUrl) {
        throw new Error("Invalid LinkedIn company URL format");
      }

      console.log("Preparing CoreSignal API request for:", cleanUrl);
      
      // Prepare the CoreSignal API request payload
      const payload = {
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

      console.log("CoreSignal API payload:", JSON.stringify(payload, null, 2));
      
      // Make the request to CoreSignal API
      const response = await fetch(CORESIGNAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CORESIGNAL_API_KEY
        },
        body: JSON.stringify(payload)
      });

      console.log("CoreSignal API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`CoreSignal API error (${response.status}): ${errorText}`);
        throw new Error(`CoreSignal API error: ${response.status} - ${errorText}`);
      }

      const apiData = await response.json();
      console.log("CoreSignal API response:", JSON.stringify(apiData, null, 2));

      // Extract company information from the CoreSignal API response
      if (apiData && apiData.hits && apiData.hits.hits && apiData.hits.hits.length > 0) {
        const companyData = apiData.hits.hits[0]._source;
        console.log("Company data from CoreSignal:", JSON.stringify(companyData, null, 2));
        
        scrapedData = {
          name: companyData.name || companyData.company_name || companyData.title || "Unknown Company",
          linkedin_url: cleanUrl,
          description: companyData.description || companyData.about || companyData.company_description || companyData.tagline || "No description available",
          employees_count: companyData.employee_count || companyData.employees_count || companyData.staff_count || companyData.company_size || companyData.size || null,
          industry: companyData.industry || companyData.industries?.[0] || companyData.sector || null,
          location: companyData.location || companyData.headquarters || companyData.address || companyData.locations?.[0] || companyData.hq_location || null,
          founded_year: companyData.founded_year || companyData.founded || companyData.year_founded || companyData.founded_on || null,
          website: companyData.website || companyData.website_url || companyData.company_website || companyData.external_url || null,
          followers_count: companyData.followers_count || companyData.followers || companyData.follower_count || null,
          company_type: companyData.company_type || companyData.type || companyData.organization_type || null,
          logo_url: companyData.logo_url || companyData.profile_pic_url || companyData.image_url || null,
          specialties: companyData.specialties || companyData.company_specialties || null,
          phone: companyData.phone || companyData.phone_number || null
        };
        
        console.log("Successfully extracted company data:", scrapedData);
      } else {
        console.log("No company data found in CoreSignal response");
        
        // Create fallback data when no results found
        const urlParts = linkedInUrl.split('/');
        let companySlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        
        // Remove trailing slash if present
        if (companySlug === '') {
          companySlug = urlParts[urlParts.length - 2];
        }
        
        scrapedData = {
          name: companySlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Company",
          linkedin_url: linkedInUrl,
          description: "LinkedIn company profile - no detailed data found in CoreSignal",
          employees_count: null,
          industry: null,
          location: null,
          founded_year: null,
          website: null,
          note: "Limited data - no match found in CoreSignal database"
        };
      }

    } catch (error) {
      console.log("LinkedIn scraping failed:", error.message);
      errorMessage = error.message;
      
      // Create fallback data on error
      const urlParts = linkedInUrl.split('/');
      let companySlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      
      // Remove trailing slash if present
      if (companySlug === '') {
        companySlug = urlParts[urlParts.length - 2];
      }
      
      scrapedData = {
        name: companySlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Company",
        linkedin_url: linkedInUrl,
        description: "LinkedIn company profile - CoreSignal API temporarily unavailable",
        employees_count: null,
        industry: null,
        location: null,
        founded_year: null,
        website: null,
        note: "Limited data - CoreSignal API error: " + errorMessage
      };
    }

    // Update the database record with the scraped data
    if (dbEntry?.id) {
      const updateData = {
        scraped_data: scrapedData,
        status: errorMessage ? 'failed' : 'completed',
        error_message: errorMessage
      };

      const { error: updateError } = await supabase
        .from('company_scrapes')
        .update(updateData)
        .eq('id', dbEntry.id);

      if (updateError) {
        console.log("Database update issue:", updateError.message);
      } else {
        console.log("Company scrape data saved to database successfully");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: errorMessage ? "LinkedIn URL processed with limited data" : "LinkedIn company data scraped successfully using CoreSignal",
        companyData: scrapedData,
        hasError: !!errorMessage,
        errorMessage: errorMessage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.log("Function error:", error.message || String(error));
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Unknown error occurred",
        message: "Failed to process LinkedIn URL"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
