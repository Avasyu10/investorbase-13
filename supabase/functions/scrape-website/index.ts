
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JINA AI API key (should be set as a secret)
const JINA_API_KEY = Deno.env.get('JINA_API_KEY') || 'jina_7413d7715601448f819a3d088dd6bec3203DltHhpvri5YXfUey1WofPaAWK';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { url } = await req.json();

    if (!url) {
      console.error("No URL provided in request");
      return new Response(
        JSON.stringify({ 
          error: 'URL is required',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Scraping website: ${url}`);

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      console.error(`Invalid URL format: ${url}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid URL format',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    try {
      // Call JINA AI API to scrape the website
      const jinaUrl = `https://r.jina.ai/${url}`;
      console.log(`Calling JINA API: ${jinaUrl}`);
      
      const response = await fetch(jinaUrl, {
        headers: {
          "Authorization": `Bearer ${JINA_API_KEY}`,
          "X-No-Cache": "true"
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`JINA API returned error (${response.status}):`, errorData);
        return new Response(
          JSON.stringify({ 
            error: `Failed to scrape website: ${response.statusText}`,
            status: response.status,
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 502 
          }
        );
      }

      // Extract content from JINA response
      const content = await response.text();
      console.log(`Successfully scraped website (${content.length} characters)`);

      // Return the scraped content
      return new Response(
        JSON.stringify({ 
          success: true,
          content,
          url
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (error) {
      console.error("Error scraping website:", error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Failed to scrape website",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
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
