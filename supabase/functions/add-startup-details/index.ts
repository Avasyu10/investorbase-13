import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      throw new Error('Unauthorized');
    }

    const formData = await req.json();
    console.log('Received startup submission:', formData);

    // Handle file uploads if present
    let pdfFileUrl = null;
    let pptFileUrl = null;

    if (formData.pdfFile) {
      const pdfPath = `${user.id}/${Date.now()}-${formData.pdfFile.name}`;
      const { data: pdfData, error: pdfError } = await supabaseClient.storage
        .from('startup-files')
        .upload(pdfPath, formData.pdfFile);

      if (pdfError) {
        console.error('PDF upload error:', pdfError);
        throw new Error('Failed to upload PDF file');
      }

      const { data: pdfUrlData } = supabaseClient.storage
        .from('startup-files')
        .getPublicUrl(pdfPath);
      
      pdfFileUrl = pdfUrlData.publicUrl;
    }

    if (formData.pptFile) {
      const pptPath = `${user.id}/${Date.now()}-${formData.pptFile.name}`;
      const { data: pptData, error: pptError } = await supabaseClient.storage
        .from('startup-files')
        .upload(pptPath, formData.pptFile);

      if (pptError) {
        console.error('PPT upload error:', pptError);
        throw new Error('Failed to upload PPT file');
      }

      const { data: pptUrlData } = supabaseClient.storage
        .from('startup-files')
        .getPublicUrl(pptPath);
      
      pptFileUrl = pptUrlData.publicUrl;
    }

    // Insert the startup submission
    const { data: submission, error: insertError } = await supabaseClient
      .from('startup_submissions')
      .insert({
        user_id: user.id,
        problem_statement: formData.problem_statement,
        solution: formData.solution,
        market_understanding: formData.market_understanding,
        customer_understanding: formData.customer_understanding,
        competitive_understanding: formData.competitive_understanding,
        unique_selling_proposition: formData.unique_selling_proposition,
        technical_understanding: formData.technical_understanding,
        vision: formData.vision,
        campus_affiliation: formData.campus_affiliation,
        startup_name: formData.startup_name,
        founder_email: formData.founder_email,
        linkedin_profile_url: formData.linkedin_profile_url,
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
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});