
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { decode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
      },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error",
          details: "Supabase credentials not configured"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Create a supabase client with the service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
      
      // Extract other form fields
      const title = formData.get('title') as string || 'Untitled Submission';
      const email = formData.get('email') as string;
      const description = formData.get('description') as string || '';
      const websiteUrl = formData.get('websiteUrl') as string || '';
      // Extract the form slug from the form data
      const formSlug = formData.get('formSlug') as string || '';
      // Extract question field
      const question = formData.get('question') as string || '';
      
      console.log("Processing submission with form slug:", formSlug);
      
      // Extract optional fields with fallbacks
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
      
      // Extract new company fields
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

      // Create a unique file name
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes, new name: ${fileName}`);
      
      // Decide where to store the file:
      // 1. If it's associated with a form, use the form creator's user_id
      // 2. If no form is associated, use a default location
      let storageUserId = 'public-uploads';
      
      // Get associated form if formSlug is provided
      let formOwnerId = null;
      let shouldAutoAnalyze = false;
      let submissionFormId = null;
      if (formSlug) {
        const { data: formData, error: formError } = await supabase
          .from('public_submission_forms')
          .select('id, user_id, auto_analyze')
          .eq('form_slug', formSlug)
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
          console.log("No form found with slug:", formSlug);
        }
      }
      
      // Create the proper file path structure
      const filePath = `${storageUserId}/${fileName}`;
      
      // Convert file data to buffer for storage
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      
      // Check if the report_pdfs bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const reportPdfsBucketExists = buckets?.some(bucket => bucket.name === 'report_pdfs');
      
      if (!reportPdfsBucketExists) {
        console.log("report_pdfs bucket does not exist, creating it...");
        const { error: createBucketError } = await supabase.storage.createBucket('report_pdfs', {
          public: false,
        });
        
        if (createBucketError) {
          console.error("Error creating report_pdfs bucket:", createBucketError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Storage initialization failed", 
              details: createBucketError.message 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500 
            }
          );
        }
      }
      
      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from('report_pdfs')
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: true
        });
        
      if (uploadError) {
        console.error("Error uploading file:", uploadError);
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
      
      console.log("File uploaded successfully:", filePath);
      
      // Parse employee count to number if provided
      let employeeCountNum = null;
      if (employeeCount) {
        try {
          employeeCountNum = parseInt(employeeCount, 10);
        } catch (e) {
          console.error("Error parsing employee count:", e);
        }
      }
      
      // Create a record in public_form_submissions table
      const { data: submissionData, error: submissionError } = await supabase
        .from('public_form_submissions')
        .insert({
          title,
          description,
          website_url: websiteUrl,
          pdf_url: filePath, // Store the full path to retrieve the file correctly
          form_slug: formSlug, // Save the form slug to the database
          company_stage: companyStage,
          industry,
          founder_linkedin_profiles: linkedInProfiles,
          question, // Store the question field
          submitter_email: email, // Store the submitter's email
          // New company fields
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
          // Founder information
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
        console.error("Error creating submission record:", submissionError);
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
      
      console.log("Submission record created:", submissionData.id);
      
      // Create a corresponding report record that can be analyzed
      let reportId;
      if (formOwnerId) {
        console.log("Creating report record for form owner:", formOwnerId);
        
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .insert({
            title,
            description,
            pdf_url: filePath, // Use the full path here as well
            user_id: formOwnerId,
            is_public_submission: true,
            submitter_email: email,
            submission_form_id: submissionFormId
          })
          .select()
          .single();
          
        if (reportError) {
          console.error("Error creating report record:", reportError);
        } else if (reportData) {
          console.log("Report record created:", reportData.id);
          reportId = reportData.id;
          
          // Update the submission record with the report ID
          const { error: updateError } = await supabase
            .from('public_form_submissions')
            .update({ report_id: reportId })
            .eq('id', submissionData.id);
            
          if (updateError) {
            console.error("Error updating submission with report ID:", updateError);
          }
          
          // If auto-analyze is enabled, trigger analysis
          if (shouldAutoAnalyze) {
            try {
              console.log("Auto-analyze is enabled, triggering analysis");
              
              // Call the auto-analyze edge function
              const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/auto-analyze-public-pdf`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ 
                  reportId: reportId
                })
              });
              
              if (!analyzeResponse.ok) {
                console.error("Analysis triggering failed:", await analyzeResponse.text());
              } else {
                console.log("Analysis successfully triggered");
              }
            } catch (analyzeError) {
              console.error("Error triggering auto-analysis:", analyzeError);
            }
          }
        }
      }
      
      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Submission received successfully",
          submissionId: submissionData.id,
          reportId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
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
    console.error("Fatal error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
