
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
  return submission;
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  console.log('Starting BARC submission analysis:', submissionId);

  try {
    // First, trigger the analysis
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });

    if (error) {
      console.error('Error invoking BARC analysis function:', error);
      throw error;
    }

    console.log('BARC analysis function response:', data);
    
    // If the function returns immediately with success, poll for completion
    if (data?.success) {
      return data;
    }
    
    // If the analysis is still processing, poll for completion
    console.log('Analysis started, polling for completion...');
    return await pollForAnalysisCompletion(submissionId);
  } catch (error) {
    console.error('Failed to analyze BARC submission:', error);
    throw error;
  }
};

// Helper function to poll for analysis completion
const pollForAnalysisCompletion = async (submissionId: string, maxAttempts: number = 60): Promise<any> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling attempt ${attempts + 1} for submission ${submissionId}`);
      
      const { data: submission, error } = await supabase
        .from('barc_form_submissions')
        .select('analysis_status, company_id, analysis_error')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('Error polling submission status:', error);
        throw error;
      }

      console.log('Current submission status:', submission);

      if (submission.analysis_status === 'completed' && submission.company_id) {
        console.log('Analysis completed successfully!');
        return {
          success: true,
          companyId: submission.company_id
        };
      }
      
      if (submission.analysis_status === 'error') {
        throw new Error(submission.analysis_error || 'Analysis failed');
      }
      
      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('Error during polling:', error);
      throw error;
    }
  }
  
  throw new Error('Analysis timed out after maximum attempts');
};
