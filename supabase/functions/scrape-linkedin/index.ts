
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brightdata API configuration
const BRIGHTDATA_API_URL = "https://api.brightdata.com/datasets/v3/trigger";
const BRIGHTDATA_API_KEY = "8fc2381a0b83bb67f390e931eeaca1a3df926f0778ed4b24fa5608a7e9b4b382";
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
    
    // Create request body for Brightdata API - array of objects with url property
    const requestBody = linkedInUrls.map(url => ({ url }));
    
    console.log(`Calling Brightdata API for ${linkedInUrls.length} profiles`);
    
    // Make request to Brightdata API
    const response = await fetch(`${BRIGHTDATA_API_URL}?dataset_id=${BRIGHTDATA_DATASET_ID}&include_errors=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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

    // Successfully scraped LinkedIn profiles
    const data = await response.json();
    console.log("Brightdata API response:", JSON.stringify(data).substring(0, 100) + "...");
    
    // Process and clean the scraped profiles
    const profiles = [];
    let hasErrors = false;
    
    // For each profile URL, process the corresponding scraped data
    for (let i = 0; i < linkedInUrls.length; i++) {
      const url = linkedInUrls[i];
      let content = "";
      
      try {
        // Extract relevant information from the API response
        // This structure might need adjustment based on actual Brightdata API response
        if (data[i] && data[i].extraction_results) {
          // Clean and format the content
          const profileData = data[i].extraction_results;
          
          // Build a structured representation of the profile
          content = `Name: ${profileData.name || 'Unknown'}\n`;
          content += `Title: ${profileData.headline || 'Unknown'}\n`;
          content += `Location: ${profileData.location || 'Unknown'}\n\n`;
          
          // Add about section if available
          if (profileData.about) {
            content += `About:\n${profileData.about}\n\n`;
          }
          
          // Add experience if available
          if (profileData.experience && Array.isArray(profileData.experience)) {
            content += "Experience:\n";
            profileData.experience.forEach((exp: any, index: number) => {
              content += `${index + 1}. ${exp.title || 'Unknown position'} at ${exp.company || 'Unknown company'}`;
              if (exp.date_range) content += ` (${exp.date_range})`;
              content += "\n";
              if (exp.description) content += `   ${exp.description}\n`;
            });
            content += "\n";
          }
          
          // Add education if available
          if (profileData.education && Array.isArray(profileData.education)) {
            content += "Education:\n";
            profileData.education.forEach((edu: any, index: number) => {
              content += `${index + 1}. ${edu.school || 'Unknown institution'}`;
              if (edu.degree) content += `, ${edu.degree}`;
              if (edu.date_range) content += ` (${edu.date_range})`;
              content += "\n";
            });
            content += "\n";
          }
          
          // Add skills if available
          if (profileData.skills && Array.isArray(profileData.skills)) {
            content += "Skills: ";
            content += profileData.skills.join(", ");
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
              // For Deno, we need to use the createClient function
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
          console.error(`No extraction results for profile: ${url}`);
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
                  error_message: 'No extraction results'
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
