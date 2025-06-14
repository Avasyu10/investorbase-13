
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

  // Create a company record for this BARC submission
  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: data.company_name,
        source: 'barc',
        overall_score: 0, // Default score, will be updated after analysis
        assessment_points: [
          `BARC Application: ${data.company_type}`,
          `Executive Summary: ${data.executive_summary.substring(0, 100)}...`
        ],
        industry: data.company_type,
        poc_name: data.poc_name,
        phonenumber: data.phoneno,
        user_id: userId
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company record:', companyError);
      // Don't throw here - the submission was successful even if company creation failed
    } else {
      console.log('Company record created successfully:', company);
      
      // Update the submission with the company_id
      await supabase
        .from('barc_form_submissions')
        .update({ company_id: company.id })
        .eq('id', submission.id);
    }
  } catch (companyCreationError) {
    console.error('Failed to create company record:', companyCreationError);
    // Continue - the submission itself was successful
  }

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
