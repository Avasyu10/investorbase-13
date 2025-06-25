
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

    // Return success immediately and use background task for analysis
    const response = new Response(
      JSON.stringify({ 
        success: true,
        message: 'Analysis started in background',
        submissionId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

    // Use background task for the actual analysis
    EdgeRuntime.waitUntil((async () => {
      try {
        // Add longer delay to ensure database consistency
        console.log('Starting background analysis with delay...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify the submission exists and update status to processing
        console.log('Verifying submission exists and updating status...');
        const { data: submissionCheck, error: checkError } = await supabase
          .from('eureka_form_submissions')
          .select('id, analysis_status, company_name')
          .eq('id', submissionId)
          .single();

        if (checkError || !submissionCheck) {
          console.error('Submission not found during verification:', checkError);
          throw new Error(`Submission not found: ${checkError?.message || 'Unknown error'}`);
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
          throw new Error(`Failed to update submission status: ${updateError.message}`);
        }

        console.log('Status updated to processing, calling main analysis function...');
        
        // Call the main analysis function
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

        console.log('Background analysis completed successfully:', data);

      } catch (error) {
        console.error('Error in background analysis:', error);
        
        // Update submission status to failed
        try {
          await supabase
            .from('eureka_form_submissions')
            .update({
              analysis_status: 'failed',
              analysis_error: error instanceof Error ? error.message : 'Background analysis failed'
            })
            .eq('id', submissionId);
        } catch (updateError) {
          console.error('Failed to update error status:', updateError);
        }
      }
    })());

    return response;

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
