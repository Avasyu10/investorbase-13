
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RapidAPI configuration
const RAPIDAPI_HOST = "linkedin-data-api.p.rapidapi.com";
const RAPIDAPI_KEY = "2ccd2d34c2msh7cc3d6fb000aae8p1349bbjsn62fea1629a93";
const RAPIDAPI_URL = "https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url";

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
          error: "LinkedIn URLs are required and must be an array",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing LinkedIn profiles: ${linkedInUrls.join(', ')}`);
    
    // Process each LinkedIn URL
    const profiles = [];
    let hasErrors = false;
    
    for (const url of linkedInUrls) {
      if (!url.trim()) continue;
      
      try {
        console.log(`Scraping profile: ${url}`);
        
        // Encode the LinkedIn URL
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `${RAPIDAPI_URL}?url=${encodedUrl}`;
        
        // Make request to RapidAPI
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': RAPIDAPI_KEY
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`RapidAPI error (${response.status}): ${errorText}`);
          hasErrors = true;
          
          // Still add to database but mark as error
          if (reportId) {
            // Initialize Supabase client
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
            
            if (supabaseUrl && supabaseKey) {
              const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.29.0');
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              await supabase
                .from('linkedin_profile_scrapes')
                .insert({
                  report_id: reportId,
                  url,
                  content: null,
                  status: 'error',
                  error_message: `API error: ${response.status} - ${errorText}`
                });
            }
          }
          continue;
        }

        // Successfully scraped LinkedIn profile
        const data = await response.json();
        console.log(`Successfully scraped profile: ${url}`);
        
        // Format the content from the API data
        let content = "";
        
        if (data) {
          // Build a structured representation of the profile
          content = `Name: ${data.full_name || 'Unknown'}\n`;
          content += `Title: ${data.headline || data.occupation || 'Unknown'}\n`;
          content += `Location: ${data.location || 'Unknown'}\n\n`;
          
          // Add about section if available
          if (data.summary || data.about) {
            content += `About:\n${data.summary || data.about}\n\n`;
          }
          
          // Add experience if available
          if (data.experiences && Array.isArray(data.experiences)) {
            content += "Experience:\n";
            data.experiences.forEach((exp, index) => {
              content += `${index + 1}. ${exp.title || 'Unknown position'} at ${exp.company || 'Unknown company'}`;
              if (exp.date_range || exp.duration) content += ` (${exp.date_range || exp.duration})`;
              content += "\n";
              if (exp.description) content += `   ${exp.description}\n`;
            });
            content += "\n";
          }
          
          // Add education if available
          if (data.education && Array.isArray(data.education)) {
            content += "Education:\n";
            data.education.forEach((edu, index) => {
              content += `${index + 1}. ${edu.school || edu.institution || 'Unknown institution'}`;
              if (edu.degree || edu.field_of_study) {
                content += `, ${edu.degree || ''} ${edu.field_of_study || ''}`.trim();
              }
              if (edu.date_range) content += ` (${edu.date_range})`;
              content += "\n";
            });
            content += "\n";
          }
          
          // Add skills if available
          if (data.skills && Array.isArray(data.skills)) {
            content += "Skills: ";
            content += data.skills.join(", ");
            content += "\n\n";
          }
          
          // Remove any HTML tags that might be present
          content = content.replace(/<[^>]*>/g, '');
          
          profiles.push({
            url,
            content
          });
          
          // Store the scraped profile in the database if reportId is provided
          if (reportId) {
            // Initialize Supabase client
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
            
            if (supabaseUrl && supabaseKey) {
              const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.29.0');
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              // Insert the scraped profile into the linkedin_profile_scrapes table
              const { error: insertError } = await supabase
                .from('linkedin_profile_scrapes')
                .insert({
                  report_id: reportId,
                  url,
                  content,
                  status: 'success'
                });
                
              if (insertError) {
                console.error(`Error storing LinkedIn profile in database: ${insertError.message}`);
              }
            }
          }
        } else {
          console.error(`Invalid or empty response for profile: ${url}`);
          hasErrors = true;
          
          // Store error in database
          if (reportId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
            
            if (supabaseUrl && supabaseKey) {
              const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.29.0');
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              await supabase
                .from('linkedin_profile_scrapes')
                .insert({
                  report_id: reportId,
                  url,
                  content: null,
                  status: 'error',
                  error_message: 'Invalid or empty API response'
                });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing LinkedIn profile ${url}:`, error);
        hasErrors = true;
        
        // Store error in database
        if (reportId) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
          const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
          
          if (supabaseUrl && supabaseKey) {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.29.0');
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            await supabase
              .from('linkedin_profile_scrapes')
              .insert({
                report_id: reportId,
                url,
                content: null,
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Unknown error'
              });
          }
        }
      }
    }

    // Return success even if some profiles failed, as long as we have at least one profile
    if (profiles.length === 0 && hasErrors) {
      console.error("All LinkedIn profiles failed to scrape");
      return new Response(
        JSON.stringify({ 
          error: "Failed to scrape any LinkedIn profiles",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    console.log(`Successfully scraped ${profiles.length} LinkedIn profiles`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        profiles,
        message: `Successfully scraped ${profiles.length} LinkedIn profiles` 
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
