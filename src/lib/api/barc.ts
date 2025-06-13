
import { supabase } from "@/integrations/supabase/client";

export interface BarcSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type: string;
  executive_summary: string;
  industry: string;
  company_linkedin_url?: string;
  question_1: string;
  question_2: string;
  question_3: string;
  question_4: string;
  question_5: string;
  submitter_email: string;
  founder_linkedin_urls: string[];
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
      industry: data.industry,
      company_linkedin_url: data.company_linkedin_url || null,
      question_1: data.question_1,
      question_2: data.question_2,
      question_3: data.question_3,
      question_4: data.question_4,
      question_5: data.question_5,
      submitter_email: data.submitter_email,
      founder_linkedin_urls: data.founder_linkedin_urls,
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
  console.log('Analyzing BARC submission:', submissionId);

  try {
    console.log('Getting current user session...');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No active session found, proceeding without authentication');
    }

    console.log('Invoking analyze-barc-form function with submissionId:', submissionId);
    
    // Use the correct function invocation with proper headers
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Function invocation response:', { data, error });

    if (error) {
      console.error('Error invoking BARC analysis function:', error);
      throw new Error(`Function invocation failed: ${error.message || JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('No response data from analysis function');
    }

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    console.log('BARC analysis completed successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to analyze BARC submission:', error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Analysis failed: ${error.message}`);
    } else {
      throw new Error(`Analysis failed: ${JSON.stringify(error)}`);
    }
  }
};
