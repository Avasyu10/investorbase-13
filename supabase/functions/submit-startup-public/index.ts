import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Public startup submission received');

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    console.log('Form data received');

    // Extract form fields
    const data: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = value;
      } else {
        data[key] = value;
      }
    }

    console.log('User ID from form:', data.user_id || 'None (public submission)');

    // Handle file uploads if present
    let pdfFileUrl = null;
    let pptFileUrl = null;

    if (data.pdfFile && data.pdfFile instanceof File) {
      const pdfPath = `public/${Date.now()}-${data.pdfFile.name}`;
      const { error: pdfError } = await supabaseAdmin.storage
        .from('startup-files')
        .upload(pdfPath, data.pdfFile);

      if (pdfError) {
        console.error('PDF upload error:', pdfError);
      } else {
        const { data: pdfUrlData } = supabaseAdmin.storage
          .from('startup-files')
          .getPublicUrl(pdfPath);
        pdfFileUrl = pdfUrlData.publicUrl;
      }
    }

    if (data.pptFile && data.pptFile instanceof File) {
      const pptPath = `public/${Date.now()}-${data.pptFile.name}`;
      const { error: pptError } = await supabaseAdmin.storage
        .from('startup-files')
        .upload(pptPath, data.pptFile);

      if (pptError) {
        console.error('PPT upload error:', pptError);
      } else {
        const { data: pptUrlData } = supabaseAdmin.storage
          .from('startup-files')
          .getPublicUrl(pptPath);
        pptFileUrl = pptUrlData.publicUrl;
      }
    }

    // Insert the startup submission with or without user_id
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('startup_submissions')
      .insert({
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
        linkedin_profile_url: data.linkedin_profile_url || null,
        pdf_file_url: pdfFileUrl,
        ppt_file_url: pptFileUrl,
        user_id: data.user_id || null, // Include user_id if provided, otherwise null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Startup submission created:', submission?.id);

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
    console.error('Error in submit-startup-public:', error);
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
