
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
    console.log('BARC API submission with corrected structure:', submissionData);

    // Validate required fields
    if (!submissionData.form_slug || !submissionData.company_name || !submissionData.submitter_email) {
      throw new Error('Missing required fields: form_slug, company_name, and submitter_email are required');
    }

    // Prepare submission data for the corrected table structure
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
      submitter_email: submissionData.submitter_email
    };

    console.log('Inserting BARC submission with corrected structure:', formattedData);

    // Insert into barc_form_submissions table using the corrected RLS policies
    const { data, error } = await supabase
      .from('barc_form_submissions')
      .insert(formattedData)
      .select()
      .single();

    if (error) {
      console.error('Database insertion error:', error);
      throw new Error(`Failed to save submission: ${error.message}`);
    }

    console.log('BARC submission saved successfully with corrected structure:', data);
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

    // First check if the submission exists and get its current status
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      console.error('Error fetching submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }

    if (!submission) {
      throw new Error('Submission not found');
    }

    console.log('Found submission:', submission);

    // Update status to processing before calling the function
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating status to processing:', updateError);
    }

    // Call the analyze-barc-submission edge function
    console.log('Calling analyze-barc-submission edge function...');
    
    const { data, error } = await supabase.functions.invoke('analyze-barc-submission', {
      body: { submissionId },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      
      // Update status to error
      await supabase
        .from('barc_form_submissions')
        .update({ 
          analysis_status: 'error',
          analysis_error: error.message 
        })
        .eq('id', submissionId);
      
      throw new Error(`Analysis failed: ${error.message}`);
    }

    console.log('Edge function response:', data);

    if (!data || !data.success) {
      const errorMsg = data?.error || 'Unknown error from analysis function';
      
      // Update status to error
      await supabase
        .from('barc_form_submissions')
        .update({ 
          analysis_status: 'error',
          analysis_error: errorMsg 
        })
        .eq('id', submissionId);
      
      throw new Error(`Analysis failed: ${errorMsg}`);
    }

    console.log('Analysis completed successfully:', data);
    return data;

  } catch (error) {
    console.error('Analysis API error:', error);
    
    // Try to update the status to error if possible
    try {
      await supabase
        .from('barc_form_submissions')
        .update({ 
          analysis_status: 'error',
          analysis_error: error instanceof Error ? error.message : 'Unknown error' 
        })
        .eq('id', submissionId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
    throw error;
  }
};
