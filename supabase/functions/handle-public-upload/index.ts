
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// This edge function handles uploads from the public form
serve(async (req) => {
  try {
    // CORS headers - allow all origins and methods
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Ensure the request is a POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse the request body
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const email = formData.get('email') as string;
    const description = formData.get('description') as string || '';

    if (!file || !title || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: file, title, and email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create Supabase client with service role key (no authentication required)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Upload file to public_uploads bucket without any auth checks
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

    // Get public URL for the file
    const { data: urlData } = await supabase.storage
      .from('public_uploads')
      .getPublicUrl(fileName);

    // Insert record in the reports table
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description: description + `\nContact Email: ${email}`,
        pdf_url: fileName,
        is_public_submission: true,
        submitter_email: email,
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
