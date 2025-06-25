
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`Auto-analyze Eureka submission - Request method: ${req.method}`);
  
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

  try {
    const requestBody = await req.json();
    const { submissionId, companyName, submitterEmail, createdAt } = requestBody;
    
    console.log('Auto-analyze Eureka submission request:', {
      submissionId,
      companyName,
      submitterEmail,
      createdAt
    });
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Add a delay to ensure the submission is fully committed to the database
    console.log('Adding delay to ensure database consistency...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the submission exists
    console.log('Verifying submission exists...');
    const { data: submissionCheck, error: checkError } = await supabase
      .from('eureka_form_submissions')
      .select('id, analysis_status, company_name')
      .eq('id', submissionId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking submission:', checkError);
      throw new Error(`Failed to verify submission: ${checkError.message}`);
    }

    if (!submissionCheck) {
      console.error('Submission not found:', submissionId);
      throw new Error(`Submission not found: ${submissionId}`);
    }

    console.log('Submission verified:', submissionCheck);

    // Update status to processing
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission status:', updateError);
      // Continue anyway, this is not critical
    }

    console.log('Status updated to processing, calling main analysis function...');
    
    // Call the main analysis function using the invoke method
    const { data, error } = await supabase.functions.invoke('analyze-eureka-form', {
      body: { submissionId }
    });

    if (error) {
      console.error('Error from analyze-eureka-form function:', error);
      
      // Update submission status to failed
      await supabase
        .from('eureka_form_submissions')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message || 'Analysis function failed'
        })
        .eq('id', submissionId);
      
      throw new Error(`Analysis function failed: ${error.message}`);
    }

    console.log('Analysis function completed successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in auto-analyze-eureka-submission function:', error);

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
