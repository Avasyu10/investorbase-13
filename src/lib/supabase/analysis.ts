
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // First, check if this is from an email or email pitch submission
    const { data: emailSubmission } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
      
    const { data: emailPitchSubmission } = await supabase
      .from('email_pitch_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
      
    const { data: publicFormSubmission } = await supabase
      .from('public_form_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
    
    // Update report status to pending
    await supabase
      .from('reports')
      .update({
        analysis_status: 'pending',
        analysis_error: null
      })
      .eq('id', reportId);
    
    // Determine which edge function to call based on submission type
    let endpoint = 'analyze-pdf';
    
    if (emailSubmission || emailPitchSubmission) {
      endpoint = 'analyze-email-pitch-pdf';
      console.log(`Will use ${endpoint} for analysis`);
    } else if (publicFormSubmission) {
      endpoint = 'analyze-public-pdf';
      console.log(`Will use ${endpoint} for public form submission analysis`);
    } else {
      console.log(`Will use default ${endpoint} for analysis`);
    }
    
    console.log(`Using endpoint: ${endpoint} for analysis of report ${reportId}`);
    
    // Call the appropriate edge function with better error handling
    try {
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { reportId }
      });
      
      if (error) {
        console.error(`Error invoking ${endpoint} function:`, error);
        
        // Update report status to failed
        await supabase
          .from('reports')
          .update({
            analysis_status: 'failed',
            analysis_error: error.message
          })
          .eq('id', reportId);
          
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || `Unknown error occurred during analysis with ${endpoint}`;
        console.error('API returned error:', errorMessage);
        
        // Update report status to failed
        await supabase
          .from('reports')
          .update({
            analysis_status: 'failed',
            analysis_error: errorMessage
          })
          .eq('id', reportId);
          
        throw new Error(errorMessage);
      }
      
      console.log('Analysis result:', data);
      
      // Update report status to completed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'completed',
          company_id: data.companyId
        })
        .eq('id', reportId);
      
      return data;
    } catch (innerError) {
      console.error(`Error during ${endpoint} function call:`, innerError);
      
      // Update report status to failed if not already done
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: innerError instanceof Error ? innerError.message : String(innerError)
        })
        .eq('id', reportId);
      
      throw innerError;
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}
