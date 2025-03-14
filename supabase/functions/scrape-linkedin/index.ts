
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The Brightdata API endpoint and key
const BRIGHTDATA_API_URL = "https://api.brightdata.com/datasets/v3/trigger";
const BRIGHTDATA_API_KEY = Deno.env.get("BRIGHTDATA_API_KEY") || "8fc2381a0b83bb67f390e931eeaca1a3df926f0778ed4b24fa5608a7e9b4b382";
const BRIGHTDATA_DATASET_ID = "gd_l1viktl72bvl7bjuj0";

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
          error: "Invalid request format. Expected JSON with linkedInUrls property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { linkedInUrls, reportId } = reqData;
    
    if (!linkedInUrls || !Array.isArray(linkedInUrls) || linkedInUrls.length === 0) {
      console.error("Missing or invalid linkedInUrls in request");
      return new Response(
        JSON.stringify({ 
          error: "LinkedIn URLs are required and must be a non-empty array",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Scraping ${linkedInUrls.length} LinkedIn profiles for report ${reportId}`);

    // Format the input for Brightdata API
    const input = linkedInUrls.map(url => ({ url: url.trim() }));

    // Make request to Brightdata API
    console.log(`Calling Brightdata API for dataset: ${BRIGHTDATA_DATASET_ID}`);
    
    const response = await fetch(`${BRIGHTDATA_API_URL}?dataset_id=${BRIGHTDATA_DATASET_ID}&include_errors=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deliver: {
          type: "api_response"
        },
        input: input
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Brightdata API error (${response.status}): ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `Failed to scrape LinkedIn profiles: ${response.statusText}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status 
        }
      );
    }

    // Get the response from Brightdata
    const brightdataResponse = await response.json();
    console.log("Brightdata response received:", JSON.stringify(brightdataResponse).substring(0, 200) + "...");

    // Clean the profile data (remove links and images)
    const profiles = brightdataResponse.results.map((profile: any) => {
      // Create a text representation of the profile, removing HTML, links, and images
      let cleanedContent = "";
      
      if (profile.data) {
        if (profile.data.profile) {
          const p = profile.data.profile;
          cleanedContent += `Name: ${p.fullName || 'Unknown'}\n`;
          cleanedContent += `Title: ${p.title || 'Unknown'}\n`;
          cleanedContent += `Location: ${p.location || 'Unknown'}\n\n`;
          
          if (p.summary) {
            cleanedContent += `Summary: ${p.summary}\n\n`;
          }
          
          if (p.experience && Array.isArray(p.experience)) {
            cleanedContent += "Experience:\n";
            p.experience.forEach((exp: any, i: number) => {
              cleanedContent += `${i+1}. ${exp.title || 'Unknown'} at ${exp.companyName || 'Unknown'}`;
              if (exp.dateRange) cleanedContent += ` (${exp.dateRange})`;
              cleanedContent += '\n';
              if (exp.description) cleanedContent += `   ${exp.description}\n`;
            });
            cleanedContent += '\n';
          }
          
          if (p.education && Array.isArray(p.education)) {
            cleanedContent += "Education:\n";
            p.education.forEach((edu: any, i: number) => {
              cleanedContent += `${i+1}. ${edu.degree || 'Unknown'} at ${edu.school || 'Unknown'}`;
              if (edu.dateRange) cleanedContent += ` (${edu.dateRange})`;
              cleanedContent += '\n';
            });
            cleanedContent += '\n';
          }
          
          if (p.skills && Array.isArray(p.skills)) {
            cleanedContent += "Skills: " + p.skills.join(", ") + "\n\n";
          }
        }
      }
      
      return {
        url: profile.input?.url || 'Unknown URL',
        content: cleanedContent,
        raw: profile
      };
    });

    // Create a Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        // Import dynamically to avoid issues with top-level imports in edge functions
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.29.0");
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false }
        });
        
        console.log("Saving LinkedIn profile data to database");
        
        // Save profile data to database
        for (const profile of profiles) {
          const { data, error } = await supabase
            .from('linkedin_profile_scrapes')
            .insert({
              report_id: reportId,
              url: profile.url,
              content: profile.content,
              status: 'success'
            });
            
          if (error) {
            console.error("Error saving LinkedIn profile data:", error);
          } else {
            console.log(`Successfully saved LinkedIn profile data for ${profile.url}`);
          }
        }
      } catch (error) {
        console.error("Error saving LinkedIn profile data to database:", error);
      }
    } else {
      console.warn("Supabase credentials not available, skipping database storage");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profiles: profiles.map(p => ({
          url: p.url,
          content: p.content
        })),
        message: "LinkedIn profiles scraped successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in scrape-linkedin function:", error);
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
