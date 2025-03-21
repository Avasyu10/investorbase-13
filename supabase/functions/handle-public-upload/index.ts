
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// This edge function handles uploads from the public form with no authentication required
serve(async (req) => {
  try {
    // CORS headers - allow all origins and methods
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Debug: Log request details
    console.log("Request received:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log("Handling OPTIONS preflight request");
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Ensure the request is a POST
    if (req.method !== 'POST') {
      console.log(`Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Debug: Log environment variables (without sensitive values)
    console.log("Environment variables available:", {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    });

    // Parse the request body
    console.log("Parsing form data...");
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const websiteUrl = formData.get('websiteUrl') as string || '';
    const formSlug = formData.get('formSlug') as string || '';
    const companyStage = formData.get('companyStage') as string || '';
    const industry = formData.get('industry') as string || '';
    
    // Parse LinkedIn profiles if present
    const linkedInProfilesStr = formData.get('linkedInProfiles') as string || '[]';
    let linkedInProfiles: string[] = [];
    try {
      linkedInProfiles = JSON.parse(linkedInProfilesStr);
    } catch (e) {
      console.log("Error parsing LinkedIn profiles, using empty array:", e);
    }

    console.log("Form data parsed:", {
      hasFile: !!file,
      fileType: file ? file.type : 'none',
      fileSize: file ? file.size : 0,
      title: title || 'none',
      hasDescription: !!description,
      hasWebsiteUrl: !!websiteUrl,
      formSlug: formSlug || 'none',
      companyStage: companyStage || 'none',
      industry: industry || 'none',
      linkedInProfiles: linkedInProfiles.length,
    });

    if (!title) {
      console.log("Missing required field: title");
      return new Response(JSON.stringify({ error: 'Missing required field: title' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create Supabase client without auth - using service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    console.log("Creating Supabase client...");
    // Initialize Supabase client with service role key, disabling token refresh and session persistence
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          // Don't include any authorization headers
        }
      }
    });

    // Determine the correct form slug - use the provided one or default to public-pitch-deck
    let submissionFormId = null;
    let formOwnerId = null;
    let autoAnalyze = false;
    let effectiveFormSlug = formSlug;
    
    if (!effectiveFormSlug) {
      effectiveFormSlug = 'public-pitch-deck';
    }
    
    console.log("Using form slug for submission:", effectiveFormSlug);
    
    // Look up the submission form to get the form ID, user_id, and auto_analyze setting
    const { data: submissionFormData, error: formLookupError } = await supabase
      .from('public_submission_forms')
      .select('id, user_id, auto_analyze')
      .eq('form_slug', effectiveFormSlug)
      .maybeSingle();
    
    if (formLookupError) {
      console.error('Error looking up form:', formLookupError);
    } else if (submissionFormData) {
      submissionFormId = submissionFormData.id;
      formOwnerId = submissionFormData.user_id; // Store the form owner's user_id
      autoAnalyze = submissionFormData.auto_analyze || false;
      console.log("Found existing submission form:", submissionFormId, "for user:", formOwnerId, "auto_analyze:", autoAnalyze);
    } else {
      console.log("No form found with slug:", effectiveFormSlug);
      
      // If a specific slug was requested but not found, return an error
      if (formSlug) {
        return new Response(JSON.stringify({ error: 'Submission form not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      
      // For the default case, create a new public form if it doesn't exist
      const { data: newForm, error: newFormError } = await supabase
        .from('public_submission_forms')
        .insert([{
          form_name: 'Public Pitch Deck Submission',
          form_slug: 'public-pitch-deck',
          is_active: true,
          auto_analyze: false,
          user_id: '00000000-0000-0000-0000-000000000000' // System user placeholder
        }])
        .select()
        .single();
        
      if (newFormError) {
        console.error('Error creating public submission form:', newFormError);
      } else if (newForm) {
        submissionFormId = newForm.id;
        formOwnerId = newForm.user_id;
        autoAnalyze = newForm.auto_analyze || false;
        console.log("Created new public submission form:", submissionFormId, "for user:", formOwnerId, "auto_analyze:", autoAnalyze);
      }
    }

    // Set the analysis status based on the form's auto_analyze setting
    const analysisStatus = autoAnalyze ? 'pending' : 'manual_pending';
    console.log("Setting analysis status to:", analysisStatus);

    // Process the upload - file is now optional
    let fileName = '';
    let supplementaryMaterialsUrls: string[] = [];
    
    if (file) {
      console.log("Uploading file...");
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      fileName = `${effectiveFormSlug}/${Date.now()}.${fileExt}`;

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload file to public_uploads bucket
      const { error: uploadError } = await supabase.storage
        .from('public_uploads')
        .upload(fileName, fileData, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      console.log("File uploaded successfully to path:", fileName);
    } else {
      console.log("No file provided - proceeding without file upload");
    }

    // Build enhanced description with additional context if website URL was provided
    let enhancedDescription = description;
    if (websiteUrl) {
      enhancedDescription += `\nCompany Website: ${websiteUrl}`;
    }
    if (companyStage) {
      enhancedDescription += `\nCompany Stage: ${companyStage}`;
    }
    if (industry) {
      enhancedDescription += `\nIndustry: ${industry}`;
    }

    // Insert record in the reports table without any auth checks
    // Now including the form owner's user_id
    console.log("Inserting record to reports table with form owner's user_id:", formOwnerId);
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description: enhancedDescription,
        pdf_url: fileName || null, // Use null if no file was uploaded
        is_public_submission: true,
        submission_form_id: submissionFormId,
        analysis_status: analysisStatus,
        user_id: formOwnerId // Set the user_id to the form owner's ID
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting report record:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create record', details: insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log("Report record inserted successfully:", { reportId: report.id, analysisStatus, ownerId: formOwnerId });
    
    // Also insert into our new public_form_submissions table
    console.log("Inserting record to public_form_submissions table...");
    const { data: submission, error: submissionError } = await supabase
      .from('public_form_submissions')
      .insert([{
        form_slug: effectiveFormSlug,
        title,
        description,
        website_url: websiteUrl || null,
        pdf_url: fileName || null,
        founder_linkedin_profiles: linkedInProfiles,
        company_stage: companyStage || null,
        industry: industry || null,
        supplementary_materials_urls: supplementaryMaterialsUrls,
        report_id: report.id
      }])
      .select()
      .single();
      
    if (submissionError) {
      console.error('Error inserting submission record:', submissionError);
      // Non-blocking error - we already have the data in the reports table
      // so we can continue without failing the request
    } else {
      console.log("Submission record inserted successfully:", { submissionId: submission.id });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Submission received successfully',
      reportId: report.id,
      autoAnalyze
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('General error:', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: err.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});
