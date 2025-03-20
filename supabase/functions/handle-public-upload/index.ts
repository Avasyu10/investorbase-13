
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
    const email = formData.get('email') as string;
    const description = formData.get('description') as string || '';
    const websiteUrl = formData.get('websiteUrl') as string || '';
    const formSlug = formData.get('formSlug') as string || '';

    console.log("Form data parsed:", {
      hasFile: !!file,
      fileType: file ? file.type : 'none',
      fileSize: file ? file.size : 0,
      title: title || 'none',
      email: email || 'none',
      hasDescription: !!description,
      hasWebsiteUrl: !!websiteUrl,
      formSlug: formSlug || 'none',
    });

    if (!title || !email) {
      console.log("Missing required fields: title and email");
      return new Response(JSON.stringify({ error: 'Missing required fields: title and email' }), {
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

    // Process the upload - file is now optional
    let fileName = '';
    
    if (file) {
      console.log("Uploading file...");
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      fileName = `${Date.now()}.${fileExt}`;

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload file to public_uploads bucket - which is now public with no RLS
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

      console.log("File uploaded successfully:", fileName);
    } else {
      console.log("No file provided - proceeding without file upload");
    }

    // Build enhanced description with additional context if website URL was provided
    let enhancedDescription = description;
    if (websiteUrl) {
      enhancedDescription += `\nCompany Website: ${websiteUrl}`;
    }
    enhancedDescription += `\nContact Email: ${email}`;

    // Get or create a public submission form
    console.log("Getting or creating public submission form...");
    let submissionFormId = null;
    
    if (formSlug) {
      console.log("Looking up submission form with slug:", formSlug);
      const { data: submissionFormData, error: formLookupError } = await supabase
        .from('public_submission_forms')
        .select('id, user_id')
        .eq('form_slug', formSlug)
        .maybeSingle();
      
      if (formLookupError) {
        console.error('Error looking up form:', formLookupError);
        // Continue without form ID - will create record with null form_id
      } else if (submissionFormData) {
        submissionFormId = submissionFormData.id;
        console.log("Found existing submission form:", submissionFormId, "for user:", submissionFormData.user_id);
      } else {
        console.log("No form found with slug:", formSlug);
      }
    } else {
      // For compatibility with older code that expected a specific public form
      console.log("No form slug provided, checking for public-pitch-deck form");
      const { data: publicFormData, error: publicFormError } = await supabase
        .from('public_submission_forms')
        .select('id')
        .eq('form_slug', 'public-pitch-deck')
        .maybeSingle();
        
      if (!publicFormError && publicFormData) {
        submissionFormId = publicFormData.id;
        console.log("Using public-pitch-deck form:", submissionFormId);
      } else {
        // Create a new public submission form
        console.log("Creating default public form");
        const { data: newForm, error: newFormError } = await supabase
          .from('public_submission_forms')
          .insert([{
            form_name: 'Public Pitch Deck Submission',
            form_slug: 'public-pitch-deck',
            is_active: true,
            user_id: '00000000-0000-0000-0000-000000000000' // System user placeholder
          }])
          .select()
          .single();
          
        if (newFormError) {
          console.error('Error creating public submission form:', newFormError);
          // Continue without form ID
        } else if (newForm) {
          submissionFormId = newForm.id;
          console.log("Created new public submission form:", submissionFormId);
        }
      }
    }

    // Insert record in the reports table without any auth checks
    console.log("Inserting record to database...");
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description: enhancedDescription,
        pdf_url: fileName || null, // Use null if no file was uploaded
        is_public_submission: true,
        submitter_email: email,
        submission_form_id: submissionFormId,
        analysis_status: 'pending'
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

    console.log("Record inserted successfully:", { reportId: report.id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Submission received successfully',
      reportId: report.id
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
