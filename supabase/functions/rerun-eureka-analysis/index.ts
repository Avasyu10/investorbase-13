import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Starting rerun analysis process');

    // Fetch all failed and rejected eureka submissions
    const { data: failedSubmissions, error: failedError } = await supabase
      .from('eureka_form_submissions')
      .select('id, company_name, analysis_result')
      .eq('analysis_status', 'failed');

    if (failedError) {
      console.error('Error fetching failed submissions:', failedError);
      throw failedError;
    }

    // Fetch completed submissions that were rejected (overall_score < 60)
    const { data: completedSubmissions, error: completedError } = await supabase
      .from('eureka_form_submissions')
      .select('id, company_name, analysis_result')
      .eq('analysis_status', 'completed')
      .not('analysis_result', 'is', null);

    if (completedError) {
      console.error('Error fetching completed submissions:', completedError);
      throw completedError;
    }

    // Filter completed submissions to only include rejected ones (score < 60)
    const rejectedSubmissions = (completedSubmissions || []).filter(sub => {
      if (!sub.analysis_result) return false;
      try {
        const result = typeof sub.analysis_result === 'string' 
          ? JSON.parse(sub.analysis_result) 
          : sub.analysis_result;
        return result.overall_score && result.overall_score < 60;
      } catch (e) {
        console.error('Error parsing analysis result for submission:', sub.id, e);
        return false;
      }
    });

    const submissionsToRerun = [...(failedSubmissions || []), ...rejectedSubmissions];
    
    console.log(`📊 Found ${submissionsToRerun.length} submissions to rerun:`);
    console.log(`  Failed: ${failedSubmissions?.length || 0}`);
    console.log(`  Rejected: ${rejectedSubmissions.length}`);

    if (submissionsToRerun.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No failed or rejected submissions found to rerun',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset analysis status to 'processing' and clear errors
    const submissionIds = submissionsToRerun.map(s => s.id);
    
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'processing',
        analysis_error: null,
        analyzed_at: null
      })
      .in('id', submissionIds);

    if (updateError) {
      console.error('Error updating submission statuses:', updateError);
      throw updateError;
    }

    console.log(`✅ Reset ${submissionIds.length} submissions to processing status`);

    // Trigger analysis for each submission
    let successCount = 0;
    let errorCount = 0;

    for (const submission of submissionsToRerun) {
      try {
        console.log(`🔄 Triggering analysis for: ${submission.company_name} (${submission.id})`);
        
        const { data: analyzeResult, error: analyzeError } = await supabase.functions.invoke('analyze-eureka-form', {
          body: { submissionId: submission.id }
        });

        if (analyzeError) {
          console.error(`❌ Failed to trigger analysis for ${submission.id}:`, analyzeError);
          errorCount++;
          
          // Update submission with error status
          await supabase
            .from('eureka_form_submissions')
            .update({
              analysis_status: 'failed',
              analysis_error: `Rerun failed: ${analyzeError.message}`
            })
            .eq('id', submission.id);
        } else {
          console.log(`✅ Successfully triggered analysis for ${submission.id}`);
          successCount++;
        }
        
        // Add small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Exception triggering analysis for ${submission.id}:`, error);
        errorCount++;
        
        // Update submission with error status
        await supabase
          .from('eureka_form_submissions')
          .update({
            analysis_status: 'failed',
            analysis_error: `Rerun exception: ${error.message}`
          })
          .eq('id', submission.id);
      }
    }

    console.log(`🎯 Rerun analysis completed:`);
    console.log(`  Successfully triggered: ${successCount}`);
    console.log(`  Failed to trigger: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Rerun analysis initiated for ${successCount} submissions`,
        processed: successCount,
        failed: errorCount,
        total: submissionsToRerun.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in rerun-eureka-analysis:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});