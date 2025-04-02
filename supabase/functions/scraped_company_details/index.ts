
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
    // Parse the request to get the LinkedIn URL or shorthand name
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

    // Extract shorthand name from LinkedIn URL
    // Example: https://www.linkedin.com/company/example-company -> example-company
    let shorthandName = linkedInUrl;
    const match = linkedInUrl.match(/linkedin\.com\/company\/([^\/]+)/);
    if (match && match[1]) {
      shorthandName = match[1];
    }

    console.log("Extracted shorthand name:", shorthandName);

    if (!CORESIGNAL_JWT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "CORESIGNAL_JWT_TOKEN is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // First try to fetch using the shorthand name
    const apiUrl = `https://api.coresignal.com/v1/multi_source/company/collect/${shorthandName}`;
    console.log("Calling Coresignal API:", apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CORESIGNAL_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error("API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ 
          error: `Coresignal API error: ${response.status}`,
          message: await response.text()
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("API response received successfully");

    // Store the result in the database for future reference
    const { error: dbError } = await supabase
      .from('company_scrapes')
      .insert({
        linkedin_url: linkedInUrl,
        shorthand_name: shorthandName,
        scraped_data: data,
        status: 'success'
      });

    if (dbError) {
      console.error("Database error:", dbError);
    } else {
      console.log("Scrape data saved to database");
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyData: data
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
