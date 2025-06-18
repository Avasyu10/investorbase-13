
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Form slug to analysis function mapping
const FORM_ANALYSIS_MAPPING = {
  'eureka-sample': 'analyze-eureka-form',
  // Default for old IIT Bombay forms (form_slug contains URL parameters)
  'default': 'analyze-barc-form'
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let submissionId = null;

  try {
    const requestBody = await req.json();
    submissionId = requestBody.submissionId;
    
    console.log('Received routing request for submission:', submissionId);
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission to determine form type
    console.log('Fetching submission to determine routing...');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('id, form_slug, company_name, submitter_email')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission for routing:', {
      id: submission.id,
      form_slug: submission.form_slug,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email
    });

    // Determine which analysis function to use
    let analysisFunction = FORM_ANALYSIS_MAPPING['default']; // Default to old form analysis
    
    if (submission.form_slug && FORM_ANALYSIS_MAPPING[submission.form_slug]) {
      analysisFunction = FORM_ANALYSIS_MAPPING[submission.form_slug];
    }

    console.log(`Routing submission ${submissionId} to analysis function: ${analysisFunction}`);

    // Call the appropriate analysis function
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(analysisFunction, {
      body: { submissionId: submission.id }
    });

    if (analysisError) {
      console.error('Analysis function error:', analysisError);
      throw new Error(`Analysis failed: ${analysisError.message}`);
    }

    console.log('Analysis completed successfully:', analysisData);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId: submission.id,
        analysisFunction,
        result: analysisData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in route-submission-analysis function:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        submissionId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
