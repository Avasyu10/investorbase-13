
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LinkedIn scraping function for public uploads
const scrapeLinkedInProfilesPublic = async (urls: string[], reportId: string, supabase: any) => {
  if (!urls || urls.length === 0) return null;
  
  // Filter out empty URLs and validate LinkedIn URLs
  const validUrls = urls.filter(url => {
    const trimmedUrl = url.trim();
    return trimmedUrl && (
      trimmedUrl.includes('linkedin.com/in/') || 
      trimmedUrl.includes('linkedin.com/pub/') ||
      trimmedUrl.includes('www.linkedin.com/in/') ||
      trimmedUrl.includes('www.linkedin.com/pub/')
    );
  });
  
  if (validUrls.length === 0) {
    console.log("No valid LinkedIn URLs found");
    return null;
  }
  
  // RapidAPI configuration
  const RAPIDAPI_HOST = "linkedin-data-api.p.rapidapi.com";
  const RAPIDAPI_KEY = "2ccd2d34c2msh7cc3d6fb000aae8p1349bbjsn62fea1629a93";
  const RAPIDAPI_URL = "https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url";
  
  const profiles = [];
  let successCount = 0;
  let privateProfileCount = 0;
  let errorCount = 0;
  
  for (const url of validUrls) {
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
        
        if (response.status === 403 || response.status === 401 || errorText.toLowerCase().includes('private')) {
          console.log(`Profile appears to be private: ${trimmedUrl}`);
          privateProfileCount++;
        } else {
          errorCount++;
        }
        continue;
      }

      const data = await response.json();
      
      if (!data || (data.error && data.error.toLowerCase().includes('private'))) {
        console.log(`Profile is private: ${trimmedUrl}`);
        privateProfileCount++;
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
      
    } catch (error) {
      console.error(`Error processing LinkedIn profile ${trimmedUrl}:`, error);
      errorCount++;
    }
  }
  
  // Prepare response message
  let message = `Processed ${validUrls.length} LinkedIn profiles: `;
  message += `${successCount} public profiles scraped successfully`;
  
  if (privateProfileCount > 0) {
    message += `, ${privateProfileCount} private profiles ignored`;
  }
  
  if (errorCount > 0) {
    message += `, ${errorCount} profiles failed`;
  }
  
  console.log(message);
  
  if (profiles.length > 0) {
    return {
      success: true,
      profiles,
      message
    };
  } else {
    return {
      success: false,
      profiles: null,
      error: "No public LinkedIn profiles could be scraped"
    };
  }
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    console.log("Public upload handler started");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error",
          details: "Missing Supabase configuration"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Create supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log("Supabase client created with service role");
    
    // Handle form data
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      
      // Extract file
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing file", 
            details: "No pitch deck file was provided" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      // Extract form fields
      const title = formData.get('title') as string || 'Untitled Submission';
      const email = formData.get('email') as string;
      const description = formData.get('description') as string || '';
      const websiteUrl = formData.get('websiteUrl') as string || '';
      const formSlug = formData.get('formSlug') as string || '';
      const question = formData.get('question') as string || '';
      const companyStage = formData.get('companyStage') as string || '';
      const industry = formData.get('industry') as string || '';
      
      // Parse LinkedIn profiles if provided
      let linkedInProfiles: string[] = [];
      const linkedInProfilesRaw = formData.get('linkedInProfiles');
      if (linkedInProfilesRaw) {
        try {
          linkedInProfiles = JSON.parse(linkedInProfilesRaw as string);
        } catch (e) {
          console.error("Error parsing LinkedIn profiles:", e);
        }
      }
      
      // Extract additional company fields
      const companyRegistrationType = formData.get('company_registration_type') as string || '';
      const registrationNumber = formData.get('registration_number') as string || '';
      const dpiitRecognitionNumber = formData.get('dpiit_recognition_number') as string || '';
      const indianCitizenShareholding = formData.get('indian_citizen_shareholding') as string || '';
      const executiveSummary = formData.get('executive_summary') as string || '';
      const companyType = formData.get('company_type') as string || '';
      const productsServices = formData.get('products_services') as string || '';
      const employeeCount = formData.get('employee_count') as string || '';
      const fundsRaised = formData.get('funds_raised') as string || '';
      const valuation = formData.get('valuation') as string || '';
      const lastFyRevenue = formData.get('last_fy_revenue') as string || '';
      const lastQuarterRevenue = formData.get('last_quarter_revenue') as string || '';
      
      // Extract founder information
      const founderName = formData.get('founder_name') as string || '';
      const founderGender = formData.get('founder_gender') as string || '';
      const founderEmail = formData.get('founder_email') as string || '';
      const founderContact = formData.get('founder_contact') as string || '';
      const founderAddress = formData.get('founder_address') as string || '';
      const founderState = formData.get('founder_state') as string || '';
      
      console.log("Form data extracted:", { 
        title, 
        email, 
        formSlug,
        hasFile: !!file,
        linkedInProfilesCount: linkedInProfiles.length 
      });
      
      // Validate required fields
      if (!email) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing email", 
            details: "Email is required for public submissions" 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Create unique file name
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
      
      // Determine storage path and form owner
      let storageUserId = 'public-uploads';
      let formOwnerId = null;
      let shouldAutoAnalyze = false;
      let submissionFormId = null;
      
      if (formSlug) {
        try {
          console.log("Fetching form data for slug:", formSlug);
          const { data: formData, error: formError } = await supabase
            .from('public_submission_forms')
            .select('id, user_id, auto_analyze')
            .eq('form_slug', formSlug)
            .eq('is_active', true)
            .maybeSingle();
            
          if (formError) {
            console.error("Error fetching form data:", formError);
          } else if (formData) {
            console.log("Found form:", formData);
            formOwnerId = formData.user_id;
            storageUserId = formData.user_id;
            shouldAutoAnalyze = formData.auto_analyze;
            submissionFormId = formData.id;
          } else {
            console.log("No active form found with slug:", formSlug);
          }
        } catch (err) {
          console.error("Error querying form data:", err);
        }
      }
      
      const filePath = `${storageUserId}/${fileName}`;
      console.log("Storage path:", filePath);
      
      // Upload file to storage
      try {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);
        
        const { error: uploadError } = await supabase.storage
          .from('report_pdfs')
          .upload(filePath, fileBuffer, {
            contentType: file.type
          });
          
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Upload failed", 
              details: uploadError.message 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }
        
        console.log("File uploaded successfully to storage");
      } catch (uploadErr) {
        console.error("File upload exception:", uploadErr);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "File upload failed", 
            details: uploadErr instanceof Error ? uploadErr.message : "Unknown upload error"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
      
      // Scrape LinkedIn profiles if provided
      let enhancedDescription = description;
      if (linkedInProfiles.length > 0) {
        console.log("Starting LinkedIn profile scraping");
        try {
          const linkedInResult = await scrapeLinkedInProfilesPublic(linkedInProfiles, 'public', supabase);
          
          if (linkedInResult?.success && linkedInResult.profiles) {
            let linkedInContent = "FOUNDER LINKEDIN PROFILES ANALYSIS:\n\n";
            
            linkedInResult.profiles.forEach((profile, index) => {
              linkedInContent += `=== FOUNDER ${index + 1} PROFILE ===\n`;
              linkedInContent += `LinkedIn URL: ${profile.url}\n\n`;
              linkedInContent += `Professional Background:\n${profile.content}\n\n`;
              linkedInContent += "--- End of Profile ---\n\n";
            });
            
            linkedInContent += "\nThis LinkedIn profile data should be analyzed for:\n";
            linkedInContent += "- Relevant industry experience\n";
            linkedInContent += "- Leadership roles and achievements\n";
            linkedInContent += "- Educational background\n";
            linkedInContent += "- Skills relevant to the business\n";
            linkedInContent += "- Network and connections quality\n";
            linkedInContent += "- Previous startup or entrepreneurial experience\n\n";
            
            enhancedDescription += `\n\n${linkedInContent}`;
            console.log("LinkedIn profiles added to description");
          } else {
            console.log("LinkedIn scraping failed or no public profiles found");
          }
        } catch (linkedInError) {
          console.error("Error scraping LinkedIn profiles:", linkedInError);
        }
      }
      
      // Parse employee count
      let employeeCountNum = null;
      if (employeeCount) {
        try {
          employeeCountNum = parseInt(employeeCount, 10);
        } catch (e) {
          console.error("Error parsing employee count:", e);
        }
      }
      
      // Create submission record
      let submissionData;
      try {
        console.log("Creating submission record");
        const { data, error: submissionError } = await supabase
          .from('public_form_submissions')
          .insert({
            title,
            description: enhancedDescription,
            website_url: websiteUrl,
            pdf_url: filePath,
            form_slug: formSlug,
            company_stage: companyStage,
            industry,
            founder_linkedin_profiles: linkedInProfiles,
            question,
            submitter_email: email,
            company_registration_type: companyRegistrationType,
            registration_number: registrationNumber,
            dpiit_recognition_number: dpiitRecognitionNumber,
            indian_citizen_shareholding: indianCitizenShareholding,
            executive_summary: executiveSummary,
            company_type: companyType,
            products_services: productsServices,
            employee_count: employeeCountNum,
            funds_raised: fundsRaised,
            valuation: valuation,
            last_fy_revenue: lastFyRevenue,
            last_quarter_revenue: lastQuarterRevenue,
            founder_name: founderName,
            founder_gender: founderGender,
            founder_email: founderEmail,
            founder_contact: founderContact,
            founder_address: founderAddress,
            founder_state: founderState
          })
          .select()
          .single();
          
        if (submissionError) {
          console.error("Submission record creation error:", submissionError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Submission record creation failed", 
              details: submissionError.message 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }
        
        submissionData = data;
        console.log("Submission record created successfully:", submissionData.id);
      } catch (submissionErr) {
        console.error("Submission creation exception:", submissionErr);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Submission creation failed", 
            details: submissionErr instanceof Error ? submissionErr.message : "Unknown submission error"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
      
      // Create report record and trigger analysis if needed
      let reportId;
      if (formOwnerId) {
        console.log("Creating report record for form owner:", formOwnerId);
        
        try {
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .insert({
              title,
              description: enhancedDescription,
              pdf_url: filePath,
              user_id: formOwnerId,
              is_public_submission: true,
              submitter_email: email,
              submission_form_id: submissionFormId
            })
            .select()
            .single();
            
          if (reportError) {
            console.error("Report record creation error:", reportError);
          } else if (reportData) {
            console.log("Report record created successfully:", reportData.id);
            reportId = reportData.id;
            
            // Update submission with report ID
            try {
              const { error: updateError } = await supabase
                .from('public_form_submissions')
                .update({ report_id: reportId })
                .eq('id', submissionData.id);
                
              if (updateError) {
                console.error("Error updating submission with report ID:", updateError);
              } else {
                console.log("Submission updated with report ID");
              }
            } catch (updateErr) {
              console.error("Update submission exception:", updateErr);
            }
            
            // Trigger auto-analysis if enabled
            if (shouldAutoAnalyze) {
              console.log("Auto-analyze enabled, triggering analysis");
              
              try {
                // Use supabase.functions.invoke instead of fetch to avoid auth issues
                const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('auto-analyze-public-pdf', {
                  body: { reportId: reportId }
                });
                
                if (analyzeError) {
                  console.error("Analysis trigger failed:", analyzeError);
                } else {
                  console.log("Analysis triggered successfully:", analyzeData);
                }
              } catch (analyzeError) {
                console.error("Error triggering auto-analysis:", analyzeError);
              }
            } else {
              console.log("Auto-analyze disabled for this form");
            }
          }
        } catch (reportErr) {
          console.error("Report creation exception:", reportErr);
        }
      } else {
        console.log("No form owner found, submission saved without report creation");
      }
      
      console.log("Public upload completed successfully");
      
      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Submission received successfully",
          submissionId: submissionData.id,
          reportId,
          autoAnalyzeTriggered: shouldAutoAnalyze && reportId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      console.error("Invalid content type");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid request format", 
          details: "Expected multipart/form-data" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
  } catch (error) {
    console.error("Fatal error in public upload handler:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Unknown fatal error" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
