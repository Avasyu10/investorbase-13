
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The JINA AI API endpoint for website scraping
const JINA_API_URL = "https://r.jina.ai";
const JINA_API_KEY = "jina_7413d7715601448f819a3d088dd6bec3203DltHhpvri5YXfUey1WofPaAWK";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON with websiteUrl property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { websiteUrl } = reqData;
    
    if (!websiteUrl) {
      console.error("Missing websiteUrl in request");
      return new Response(
        JSON.stringify({ 
          error: "Website URL is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Scraping website: ${websiteUrl}`);

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch (e) {
      console.error(`Invalid URL format: "${websiteUrl}"`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid URL format: ${websiteUrl}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Make request to JINA AI
    const jinaUrl = `${JINA_API_URL}/${websiteUrl}`;
    console.log(`Calling JINA AI at: ${jinaUrl}`);
    
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'X-No-Cache': 'true'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JINA API error (${response.status}): ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Failed to scrape website: ${response.statusText}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status 
        }
      );
    }

    // Successfully scraped website content
    const scrapedContent = await response.text();
    console.log("Website scraped successfully, content length:", scrapedContent.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scrapedContent,
        message: "Website scraped successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in scrape-website function:", error);
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
