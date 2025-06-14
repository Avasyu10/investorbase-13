
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
      poc_name: data.poc_name, // Map to new poc_name column
      phoneno: data.phoneno, // Map to new phoneno column
      user_id: userId, // Set user_id if user is authenticated
      analysis_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting BARC form:', error);
    throw error;
  }

  console.log('BARC form submitted successfully:', submission);

  // Return the submission without automatically triggering analysis
  // Analysis can be triggered manually later if needed
  return submission;
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  console.log('Analyzing BARC submission:', submissionId);

  try {
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });

    if (error) {
      console.error('Error invoking BARC analysis function:', error);
      throw error;
    }

    console.log('BARC analysis completed:', data);
    return data;
  } catch (error) {
    console.error('Failed to analyze BARC submission:', error);
    throw error;
  }
};
