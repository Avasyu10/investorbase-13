import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with the auth token from the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const formData = await req.formData();
    console.log('Received startup submission form data');

    // Convert FormData to object for easier access
    const data: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Handle file uploads if present
    let pdfFileUrl = null;
    let pptFileUrl = null;

    if (data.pdfFile) {
      const pdfPath = `${user.id}/${Date.now()}-${(data.pdfFile as File).name}`;
      const { data: pdfData, error: pdfError } = await supabaseClient.storage
        .from('startup-files')
        .upload(pdfPath, data.pdfFile);

      if (pdfError) {
        console.error('PDF upload error:', pdfError);
        throw new Error('Failed to upload PDF file');
      }

      const { data: pdfUrlData } = supabaseClient.storage
        .from('startup-files')
        .getPublicUrl(pdfPath);

      pdfFileUrl = pdfUrlData.publicUrl;
    }

    if (data.pptFile) {
      const pptPath = `${user.id}/${Date.now()}-${(data.pptFile as File).name}`;
      const { data: pptData, error: pptError } = await supabaseClient.storage
        .from('startup-files')
        .upload(pptPath, data.pptFile);

      if (pptError) {
        console.error('PPT upload error:', pptError);
        throw new Error('Failed to upload PPT file');
      }

      const { data: pptUrlData } = supabaseClient.storage
        .from('startup-files')
        .getPublicUrl(pptPath);

      pptFileUrl = pptUrlData.publicUrl;
    }

    // Use service role key for insertion to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert the startup submission
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('startup_submissions')
      .insert({
        user_id: user.id,
        problem_statement: data.problem_statement,
        solution: data.solution,
        market_understanding: data.market_understanding,
        customer_understanding: data.customer_understanding,
        competitive_understanding: data.competitive_understanding,
        unique_selling_proposition: data.unique_selling_proposition,
        technical_understanding: data.technical_understanding,
        vision: data.vision,
        campus_affiliation: data.campus_affiliation === 'true' || data.campus_affiliation === true,
        startup_name: data.startup_name,
        founder_email: data.founder_email,
        linkedin_profile_url: data.linkedin_profile_url,
        pdf_file_url: pdfFileUrl,
        ppt_file_url: pptFileUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Startup submission created:', submission);

    return new Response(
      JSON.stringify({
        success: true,
        data: submission,
        message: 'Startup details submitted successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in add-startup-details:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});