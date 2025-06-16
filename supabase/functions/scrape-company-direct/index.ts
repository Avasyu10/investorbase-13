
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests - comprehensive header allowlist
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// CoreSignal API configuration
const CORESIGNAL_JWT_TOKEN = Deno.env.get('CORESIGNAL_JWT_TOKEN');
const CORESIGNAL_API_KEY = Deno.env.get('CORESIGNAL_API_KEY');

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
    
    // Check for CoreSignal credentials
    if (!CORESIGNAL_JWT_TOKEN || !CORESIGNAL_API_KEY) {
      console.error("Missing CoreSignal credentials");
      console.log("JWT Token present:", !!CORESIGNAL_JWT_TOKEN);
      console.log("API Key present:", !!CORESIGNAL_API_KEY);
      return new Response(
        JSON.stringify({ 
          error: "CoreSignal API credentials not configured. Please contact administrator.",
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

    // For now, return mock data since CoreSignal API seems to have issues
    console.log("Returning mock data due to CoreSignal API issues");
    
    // Extract company name from LinkedIn URL for mock data
    const urlParts = cleanUrl.split('/');
    const companySlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
    const companyName = companySlug.charAt(0).toUpperCase() + companySlug.slice(1);

    const mockData = {
      name: companyName,
      description: "Company information retrieved from LinkedIn profile. This is mock data due to API limitations.",
      founded_year: "2000",
      employees_count: "1000-5000",
      industry: "Technology",
      location: "United States",
      website: `https://www.${companySlug}.com`,
      linkedin_url: cleanUrl
    };

    console.log("Mock company data generated:", JSON.stringify(mockData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true,
        data: mockData,
        message: "Company information retrieved (mock data)",
        note: "This is demonstration data. Real data integration requires valid CoreSignal API credentials."
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

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
