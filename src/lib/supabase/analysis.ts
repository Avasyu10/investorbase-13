
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // Get report details to determine which function to call
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      console.error('Error fetching report details:', reportError);
      throw reportError;
    }
    
    // Check report source
    const { data: emailSubmission, error: emailError } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (emailError) {
      console.error('Error checking for email submission:', emailError);
    }
    
    const { data: emailPitchSubmission, error: pitchError } = await supabase
      .from('email_pitch_submissions')
      .select('*')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (pitchError) {
      console.error('Error checking for email pitch submission:', pitchError);
    }
    
    // Determine which function to call based on the source
    let functionName = 'analyze-pdf';
    let isEmailSubmission = false;
    
    if (emailSubmission) {
      console.log('This is an email submission, using analyze-email-submission-pdf function');
      functionName = 'analyze-email-submission-pdf';
      isEmailSubmission = true;
    } else if (emailPitchSubmission) {
      console.log('This is an email pitch submission, using analyze-email-pitch-pdf function');
      functionName = 'analyze-email-pitch-pdf';
      isEmailSubmission = true;
    } else {
      console.log('This is a standard submission, using analyze-pdf function');
    }
    
    // Show toast to indicate analysis has started
    toast({
      title: "Analysis started",
      description: "We're analyzing your submission...",
    });
    
    // Call the appropriate edge function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { reportId }
    });
    
    if (error) {
      console.error(`Error invoking ${functionName} function:`, error);
      
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
      const errorMessage = data?.error || `Unknown error occurred during analysis with ${functionName}`;
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
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}
