
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

// RapidAPI configuration for LinkedIn scraping
const RAPIDAPI_HOST = "fresh-linkedin-profile-data.p.rapidapi.com";
const RAPIDAPI_KEY = "2ccd2d34c2msh7cc3d6fb000aae8p1349bbjsn62fea1629a93";

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

    // Try to scrape LinkedIn using RapidAPI
    let scrapedData = null;
    let errorMessage = null;

    try {
      console.log("Attempting to scrape LinkedIn URL:", linkedInUrl);
      
      // Clean and encode the LinkedIn URL
      const cleanUrl = linkedInUrl.trim();
      console.log("Clean URL:", cleanUrl);
      
      // For company pages, we need to use the company profile endpoint
      const isCompanyUrl = cleanUrl.includes('/company/');
      
      if (!isCompanyUrl) {
        throw new Error("Invalid LinkedIn company URL format");
      }

      // Extract company slug from URL
      const urlParts = cleanUrl.split('/company/')[1];
      const companySlug = urlParts ? urlParts.split('/')[0] : null;
      
      if (!companySlug) {
        throw new Error("Could not extract company identifier from LinkedIn URL");
      }

      console.log("Extracted company slug:", companySlug);
      
      // Use the correct RapidAPI endpoint for company data
      const apiUrl = `https://${RAPIDAPI_HOST}/get-company-profile?company_username=${companySlug}`;
      console.log("API URL:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'Accept': 'application/json'
        }
      });

      console.log("RapidAPI response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`RapidAPI error (${response.status}): ${errorText}`);
        throw new Error(`RapidAPI error: ${response.status} - ${errorText}`);
      }

      const apiData = await response.json();
      console.log("LinkedIn scraping response:", JSON.stringify(apiData, null, 2));

      // Extract company information from the API response
      if (apiData && apiData.data) {
        const data = apiData.data;
        scrapedData = {
          name: data.name || data.company_name || data.title || "Unknown Company",
          linkedin_url: cleanUrl,
          description: data.description || data.about || data.company_description || data.tagline || "No description available",
          employees_count: data.employee_count || data.employees_count || data.staff_count || data.company_size || null,
          industry: data.industry || data.industries?.[0] || data.sector || null,
          location: data.location || data.headquarters || data.address || data.locations?.[0] || null,
          founded_year: data.founded_year || data.founded || data.year_founded || data.founded_on || null,
          website: data.website || data.website_url || data.company_website || data.external_url || null,
          followers_count: data.followers_count || data.followers || data.follower_count || null,
          company_type: data.company_type || data.type || data.organization_type || null,
          logo_url: data.logo_url || data.profile_pic_url || data.image_url || null,
          specialties: data.specialties || data.company_specialties || null,
          phone: data.phone || data.phone_number || null
        };
        
        console.log("Successfully extracted company data:", scrapedData);
      } else {
        console.log("No data in API response, checking for alternative structure");
        
        // Try alternative data structures
        if (apiData.name || apiData.company_name) {
          scrapedData = {
            name: apiData.name || apiData.company_name || "Unknown Company",
            linkedin_url: cleanUrl,
            description: apiData.description || apiData.about || "No description available",
            employees_count: apiData.employee_count || apiData.employees_count || null,
            industry: apiData.industry || null,
            location: apiData.location || apiData.headquarters || null,
            founded_year: apiData.founded_year || apiData.founded || null,
            website: apiData.website || apiData.website_url || null,
            followers_count: apiData.followers_count || apiData.followers || null,
            company_type: apiData.company_type || apiData.type || null
          };
          console.log("Extracted from alternative structure:", scrapedData);
        } else {
          throw new Error("No valid company data returned from LinkedIn scraping API");
        }
      }

    } catch (error) {
      console.log("LinkedIn scraping failed:", error.message);
      errorMessage = error.message;
      
      // Try alternative approach or use basic extracted data
      const urlParts = linkedInUrl.split('/');
      let companySlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      
      // Remove trailing slash if present
      if (companySlug === '') {
        companySlug = urlParts[urlParts.length - 2];
      }
      
      scrapedData = {
        name: companySlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Company",
        linkedin_url: linkedInUrl,
        description: "LinkedIn company profile - scraping service temporarily unavailable",
        employees_count: null,
        industry: null,
        location: null,
        founded_year: null,
        website: null,
        note: "Limited data - scraping service error: " + errorMessage
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
        message: errorMessage ? "LinkedIn URL processed with limited data" : "LinkedIn company data scraped successfully",
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
