
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
}

export const submitBarcForm = async (data: BarcSubmissionData) => {
  console.log('Submitting BARC form with data:', data);

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
      analysis_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting BARC form:', error);
    throw error;
  }

  console.log('BARC form submitted successfully:', submission);

  // Trigger analysis
  try {
    console.log('Triggering analysis for submission:', submission.id);
    
    const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId: submission.id }
    });

    if (analysisError) {
      console.error('Analysis trigger error:', analysisError);
      // Don't throw here - the submission was successful, analysis can be retried
    } else {
      console.log('Analysis triggered successfully:', analysisResult);
    }
  } catch (analysisError) {
    console.error('Failed to trigger analysis:', analysisError);
    // Don't throw here - the submission was successful
  }

  return submission;
};
