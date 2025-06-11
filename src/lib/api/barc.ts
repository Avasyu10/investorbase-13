
import { supabase } from '@/integrations/supabase/client';

interface BarcSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type?: string;
  executive_summary?: string;
  company_type?: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  submitter_email: string;
}

export const submitBarcForm = async (submissionData: BarcSubmissionData) => {
  try {
    console.log('BARC API submission:', submissionData);

    // Validate required fields
    if (!submissionData.form_slug || !submissionData.company_name || !submissionData.submitter_email) {
      throw new Error('Missing required fields: form_slug, company_name, and submitter_email are required');
    }

    // Prepare submission data
    const formattedData = {
      form_slug: submissionData.form_slug,
      company_name: submissionData.company_name,
      company_registration_type: submissionData.company_registration_type || null,
      executive_summary: submissionData.executive_summary || null,
      company_type: submissionData.company_type || null,
      question_1: submissionData.question_1 || null,
      question_2: submissionData.question_2 || null,
      question_3: submissionData.question_3 || null,
      question_4: submissionData.question_4 || null,
      question_5: submissionData.question_5 || null,
      submitter_email: submissionData.submitter_email,
      analysis_status: 'pending'
    };

    console.log('Inserting BARC submission into database:', formattedData);

    // Insert into barc_form_submissions table
    const { data, error } = await supabase
      .from('barc_form_submissions')
      .insert(formattedData)
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      throw new Error(`Failed to save submission: ${error.message}`);
    }

    console.log('BARC submission saved successfully:', data);
    return data;

  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  try {
    console.log('Triggering analysis for BARC submission:', submissionId);

    if (!submissionId) {
      throw new Error('Missing submissionId');
    }

    // Call the existing Supabase edge function for BARC analysis
    const { data, error } = await supabase.functions.invoke('analyze-barc-submission', {
      body: { submissionId }
    });

    if (error) {
      console.error('Analysis function error:', error);
      throw new Error(`Failed to start analysis: ${error.message}`);
    }

    console.log('Analysis triggered successfully:', data);
    return data;

  } catch (error) {
    console.error('Analysis API error:', error);
    throw error;
  }
};
