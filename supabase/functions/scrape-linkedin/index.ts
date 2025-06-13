
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

    const { linkedInUrls, companyId } = reqData;
    
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
    
    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    let supabase = null;
    
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.29.0');
      supabase = createClient(supabaseUrl, supabaseKey);
    }
    
    // Process each LinkedIn URL
    const profiles = [];
    let successCount = 0;
    let privateProfileCount = 0;
    let errorCount = 0;
    
    for (const url of linkedInUrls) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) continue;
      
      try {
        console.log(`Scraping profile: ${trimmedUrl}`);
        
        // Encode the LinkedIn URL
        const encodedUrl = encodeURIComponent(trimmedUrl);
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
          
          // Check if it's a private profile or access denied
          if (response.status === 403 || response.status === 401 || errorText.toLowerCase().includes('private')) {
            console.log(`Profile appears to be private: ${trimmedUrl}`);
            privateProfileCount++;
            
            if (supabase && companyId) {
              await supabase
                .from('company_scrapes')
                .insert({
                  company_id: companyId,
                  linkedin_url: trimmedUrl,
                  scraped_data: null,
                  status: 'private',
                  error_message: 'Profile is private or access denied'
                });
            }
          } else {
            errorCount++;
            if (supabase && companyId) {
              await supabase
                .from('company_scrapes')
                .insert({
                  company_id: companyId,
                  linkedin_url: trimmedUrl,
                  scraped_data: null,
                  status: 'error',
                  error_message: `API error: ${response.status} - ${errorText}`
                });
            }
          }
          continue;
        }

        // Successfully got response from API
        const data = await response.json();
        
        if (!data || (data.error && data.error.toLowerCase().includes('private'))) {
          console.log(`Profile is private: ${trimmedUrl}`);
          privateProfileCount++;
          
          if (supabase && companyId) {
            await supabase
              .from('company_scrapes')
              .insert({
                company_id: companyId,
                linkedin_url: trimmedUrl,
                scraped_data: null,
                status: 'private',
                error_message: 'Profile is private'
              });
          }
          continue;
        }
        
        console.log(`Successfully scraped public profile: ${trimmedUrl}`);
        
        // Format the content from the API data for team analysis
        let content = `FOUNDER PROFESSIONAL PROFILE:\n\n`;
        
        if (data.full_name) {
          content += `Name: ${data.full_name}\n`;
        }
        
        if (data.headline || data.occupation) {
          content += `Current Role: ${data.headline || data.occupation}\n`;
        }
        
        if (data.location) {
          content += `Location: ${data.location}\n`;
        }
        
        content += `\n`;
        
        // Add professional summary
        if (data.summary || data.about) {
          content += `PROFESSIONAL SUMMARY:\n${data.summary || data.about}\n\n`;
        }
        
        // Add experience - crucial for team analysis
        if (data.experiences && Array.isArray(data.experiences) && data.experiences.length > 0) {
          content += `PROFESSIONAL EXPERIENCE:\n`;
          data.experiences.forEach((exp, index) => {
            content += `\n${index + 1}. ${exp.title || 'Position'} at ${exp.company || 'Company'}`;
            if (exp.date_range || exp.duration) {
              content += ` (${exp.date_range || exp.duration})`;
            }
            content += `\n`;
            if (exp.description) {
              content += `   Description: ${exp.description}\n`;
            }
          });
          content += `\n`;
        }
        
        // Add education
        if (data.education && Array.isArray(data.education) && data.education.length > 0) {
          content += `EDUCATION:\n`;
          data.education.forEach((edu, index) => {
            content += `${index + 1}. ${edu.school || edu.institution || 'Institution'}`;
            if (edu.degree || edu.field_of_study) {
              const degree = edu.degree || '';
              const field = edu.field_of_study || '';
              content += ` - ${degree} ${field}`.trim();
            }
            if (edu.date_range) {
              content += ` (${edu.date_range})`;
            }
            content += `\n`;
          });
          content += `\n`;
        }
        
        // Add skills - important for team capability assessment
        if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
          content += `KEY SKILLS:\n`;
          content += data.skills.slice(0, 15).join(", "); // Limit to top 15 skills
          content += `\n\n`;
        }
        
        // Add any certifications or honors
        if (data.certifications && Array.isArray(data.certifications)) {
          content += `CERTIFICATIONS:\n`;
          data.certifications.forEach((cert, index) => {
            content += `${index + 1}. ${cert.name || cert.title || cert}\n`;
          });
          content += `\n`;
        }
        
        // Remove any HTML tags that might be present
        content = content.replace(/<[^>]*>/g, '');
        
        profiles.push({
          url: trimmedUrl,
          content
        });
        
        successCount++;
        
        // Store the scraped profile in the company_scrapes table
        if (supabase && companyId) {
          const { error: insertError } = await supabase
            .from('company_scrapes')
            .insert({
              company_id: companyId,
              linkedin_url: trimmedUrl,
              scraped_data: { content, profileData: data },
              status: 'completed'
            });
            
          if (insertError) {
            console.error(`Error storing LinkedIn profile in database: ${insertError.message}`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing LinkedIn profile ${trimmedUrl}:`, error);
        errorCount++;
        
        // Store error in database
        if (supabase && companyId) {
          await supabase
            .from('company_scrapes')
            .insert({
              company_id: companyId,
              linkedin_url: trimmedUrl,
              scraped_data: null,
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
      }
    }

    // Prepare response message
    let message = `Processed ${linkedInUrls.length} LinkedIn profiles: `;
    message += `${successCount} public profiles scraped successfully`;
    
    if (privateProfileCount > 0) {
      message += `, ${privateProfileCount} private profiles ignored`;
    }
    
    if (errorCount > 0) {
      message += `, ${errorCount} profiles failed`;
    }
    
    console.log(message);
    
    // Return success if we have at least one profile or if we only had private profiles
    if (profiles.length > 0 || (privateProfileCount > 0 && errorCount === 0)) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          profiles,
          message,
          stats: {
            total: linkedInUrls.length,
            successful: successCount,
            private: privateProfileCount,
            errors: errorCount
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      console.error("All LinkedIn profiles failed to scrape");
      return new Response(
        JSON.stringify({ 
          error: "Failed to scrape any public LinkedIn profiles",
          success: false,
          message,
          stats: {
            total: linkedInUrls.length,
            successful: successCount,
            private: privateProfileCount,
            errors: errorCount
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
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
