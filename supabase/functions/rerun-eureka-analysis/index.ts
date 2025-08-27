import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('rerun-eureka-analysis: Request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { submissionIds } = await req.json();

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'submissionIds array is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('rerun-eureka-analysis: Processing submissions:', submissionIds);

    const results = [];

    for (const submissionId of submissionIds) {
      try {
        // First, reset the submission status to processing and clear errors
        const { error: updateError } = await supabase
          .from('eureka_form_submissions')
          .update({ 
            analysis_status: 'processing',
            analysis_error: null,
            analyzed_at: null
          })
          .eq('id', submissionId);

        if (updateError) {
          console.error(`rerun-eureka-analysis: Error updating submission ${submissionId}:`, updateError);
          results.push({ submissionId, success: false, error: updateError.message });
          continue;
        }

        // Invoke the analyze-eureka-form function
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-eureka-form', {
          body: { submissionId }
        });

        if (analyzeError) {
          console.error(`rerun-eureka-analysis: Error analyzing submission ${submissionId}:`, analyzeError);
          
          // Update status to failed
          await supabase
            .from('eureka_form_submissions')
            .update({ 
              analysis_status: 'failed',
              analysis_error: analyzeError.message
            })
            .eq('id', submissionId);

          results.push({ submissionId, success: false, error: analyzeError.message });
        } else {
          console.log(`rerun-eureka-analysis: Successfully triggered analysis for submission ${submissionId}`);
          results.push({ submissionId, success: true, data: analyzeData });
        }

        // Small delay between submissions to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`rerun-eureka-analysis: Unexpected error for submission ${submissionId}:`, error);
        results.push({ submissionId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`rerun-eureka-analysis: Completed - ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('rerun-eureka-analysis: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});