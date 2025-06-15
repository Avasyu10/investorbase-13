
import { supabase } from "@/integrations/supabase/client";

export interface BarcSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type: string;
  executive_summary: string;
  company_type: string;
  company_linkedin_url?: string;
  question_1: string;
  question_2: string;
  question_3: string;
  question_4: string;
  question_5: string;
  submitter_email: string;
  founder_linkedin_urls: string[];
  poc_name: string;
  phoneno: string;
}

export const submitBarcForm = async (data: BarcSubmissionData) => {
  console.log('Submitting BARC form with data:', data);

  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  const { data: submission, error } = await supabase
    .from('barc_form_submissions')
    .insert({
      form_slug: data.form_slug,
      company_name: data.company_name,
      company_registration_type: data.company_registration_type,
      executive_summary: data.executive_summary,
      company_type: data.company_type,
      company_linkedin_url: data.company_linkedin_url || null,
      question_1: data.question_1,
      question_2: data.question_2,
      question_3: data.question_3,
      question_4: data.question_4,
      question_5: data.question_5,
      submitter_email: data.submitter_email,
      founder_linkedin_urls: data.founder_linkedin_urls,
      poc_name: data.poc_name,
      phoneno: data.phoneno,
      user_id: userId,
      analysis_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting BARC form:', error);
    throw error;
  }

  console.log('BARC form submitted successfully:', submission);

  // Immediately trigger analysis after successful submission
  console.log('Starting analysis immediately after submission...');
  try {
    // First update status to processing
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submission.id);

    if (updateError) {
      console.error('Error updating status to processing:', updateError);
    } else {
      console.log('Status updated to processing, invoking analysis function...');
      
      // Then invoke the analysis function immediately
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-barc-form', {
        body: { submissionId: submission.id }
      });

      if (analysisError) {
        console.error('Error invoking analysis function:', analysisError);
        
        // Update status back to failed if function call fails
        await supabase
          .from('barc_form_submissions')
          .update({ 
            analysis_status: 'failed',
            analysis_error: analysisError.message || 'Failed to start analysis'
          })
          .eq('id', submission.id);
      } else {
        console.log('Analysis function invoked successfully:', analysisData);
      }
    }
  } catch (error) {
    console.error('Error during immediate analysis trigger:', error);
    
    // Update status to failed
    await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'failed',
        analysis_error: error instanceof Error ? error.message : 'Failed to start analysis'
      })
      .eq('id', submission.id);
  }

  return submission;
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  console.log('Starting BARC submission analysis:', submissionId);

  try {
    // First, update status to processing
    console.log('Updating status to processing...');
    await supabase
      .from('barc_form_submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submissionId);

    // Then trigger the analysis function
    console.log('Invoking analyze-barc-form function...');
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });

    if (error) {
      console.error('Error invoking BARC analysis function:', error);
      
      // Update status to failed
      await supabase
        .from('barc_form_submissions')
        .update({ 
          analysis_status: 'failed',
          analysis_error: error.message || 'Analysis failed to start'
        })
        .eq('id', submissionId);
      
      throw new Error(`Analysis failed: ${error.message}`);
    }

    console.log('Analysis function invoked, response:', data);
    
    // Start polling for completion
    console.log('Starting to poll for completion...');
    const result = await pollForAnalysisCompletion(submissionId);
    
    console.log('Final polling result:', result);
    return result;
    
  } catch (error) {
    console.error('Failed to analyze BARC submission:', error);
    throw error;
  }
};

// Helper function to poll for analysis completion
const pollForAnalysisCompletion = async (submissionId: string, maxAttempts: number = 120): Promise<any> => {
  let attempts = 0;
  
  console.log(`Starting to poll for submission ${submissionId} completion...`);
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for submission ${submissionId}`);
      
      const { data: submission, error } = await supabase
        .from('barc_form_submissions')
        .select('analysis_status, company_id, analysis_error')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('Error polling submission status:', error);
        throw new Error(`Failed to check analysis status: ${error.message}`);
      }

      console.log(`Current submission status: ${submission.analysis_status}, company_id: ${submission.company_id}`);

      // Check for completion
      if (submission.analysis_status === 'completed' && submission.company_id) {
        console.log('Analysis completed successfully! Company ID:', submission.company_id);
        return {
          success: true,
          companyId: submission.company_id,
          message: 'Analysis completed successfully'
        };
      }
      
      // Check for error
      if (submission.analysis_status === 'error' || submission.analysis_status === 'failed') {
        const errorMessage = submission.analysis_error || 'Analysis failed with unknown error';
        console.error('Analysis failed with error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Still processing, wait before next poll
      console.log(`Analysis still in progress (status: ${submission.analysis_status}), waiting 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
      
    } catch (error) {
      console.error('Error during polling attempt:', error);
      
      // If it's a known error, throw it immediately
      if (error instanceof Error && (
        error.message.includes('Analysis failed') || 
        error.message.includes('failed with unknown error')
      )) {
        throw error;
      }
      
      // For other errors, continue polling unless we've exceeded max attempts
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Analysis polling failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log(`Polling error, retrying in 3 seconds... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  throw new Error(`Analysis timed out after ${maxAttempts} attempts (${maxAttempts * 3} seconds)`);
};
