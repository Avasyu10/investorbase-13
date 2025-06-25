
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`Trigger Eureka analysis - Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { submissionId } = await req.json();
    
    console.log('Triggering Eureka analysis for submission:', submissionId);
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Wait a bit to ensure the submission is fully committed
    console.log('Waiting for database commit...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify the submission exists first
    const { data: submission, error: fetchError } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Submission not found or error fetching:', fetchError);
      throw new Error(`Submission not found: ${submissionId}`);
    }

    console.log('Submission found, updating status to processing...');

    // Update status to processing
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating status:', updateError);
      // Don't throw here, continue with analysis
    }

    console.log('Calling analyze-eureka-form function...');

    // Call the main analysis function
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-eureka-form', {
      body: { submissionId }
    });

    if (analysisError) {
      console.error('Analysis function error:', analysisError);
      
      // Update submission status to failed
      await supabase
        .from('eureka_form_submissions')
        .update({
          analysis_status: 'failed',
          analysis_error: analysisError.message || 'Analysis function failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
      
      throw new Error(`Analysis failed: ${analysisError.message}`);
    }

    console.log('Analysis completed successfully:', analysisData);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in trigger-eureka-analysis function:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
