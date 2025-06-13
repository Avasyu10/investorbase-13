
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
  founder_linkedin_urls?: string[];
}

export const submitBarcForm = async (submissionData: BarcSubmissionData) => {
  try {
    console.log('BARC API submission with LinkedIn URLs:', submissionData);

    // Validate required fields
    if (!submissionData.form_slug || !submissionData.company_name || !submissionData.submitter_email) {
      throw new Error('Missing required fields: form_slug, company_name, and submitter_email are required');
    }

    // Get current user session to check if they're authenticated and an IIT Bombay user
    const { data: { session } } = await supabase.auth.getSession();
    let userId = null;

    if (session?.user) {
      // Check if user is IIT Bombay user
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_iitbombay')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_iitbombay) {
        userId = session.user.id;
        console.log('Setting user_id for IIT Bombay user:', userId);
      }
    }

    // Prepare submission data for the updated table structure
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
      founder_linkedin_urls: submissionData.founder_linkedin_urls || [],
      user_id: userId
    };

    console.log('Inserting BARC submission with user_id:', formattedData);

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

    console.log('BARC submission saved successfully with user_id:', data);
    return data;

  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  try {
    console.log('Starting analysis for BARC submission:', submissionId);

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

    console.log('Found submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      analysis_status: submission.analysis_status,
      user_id: submission.user_id
    });

    // PREVENT DUPLICATE ANALYSIS: Check if already completed
    if (submission.analysis_status === 'completed') {
      console.log('Analysis already completed, returning existing result');
      return {
        success: true,
        submissionId,
        analysisResult: submission.analysis_result,
        companyId: submission.company_id,
        isNewCompany: false,
        message: 'Analysis already completed'
      };
    }

    // PREVENT DUPLICATE ANALYSIS: Check if already processing
    if (submission.analysis_status === 'processing') {
      throw new Error('This submission is already being analyzed. Please wait for it to complete.');
    }

    console.log('Calling analyze-barc-form edge function...');
    
    // Use supabase.functions.invoke to call the analysis function
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });

    console.log('Edge function response:', { data, error });

    if (error) {
      console.error('Edge function error:', error);
      
      // Check if it's a conflict error (already processing)
      if (error.message?.includes('already being analyzed') || error.message?.includes('already being processed') || error.message?.includes('concurrent_processing')) {
        throw new Error('This submission is already being analyzed. Please wait for it to complete.');
      }
      
      throw new Error(`Analysis failed: ${error.message}`);
    }

    if (!data) {
      const errorMsg = 'No response from analysis function';
      throw new Error(errorMsg);
    }

    if (!data.success) {
      const errorMsg = data.error || 'Unknown error from analysis function';
      
      // Don't throw error if it's a conflict (already processing)
      if (errorMsg.includes('already being analyzed') || errorMsg.includes('already being processed') || errorMsg.includes('concurrent_processing')) {
        throw new Error('This submission is already being analyzed. Please wait for it to complete.');
      }
      
      throw new Error(`Analysis failed: ${errorMsg}`);
    }

    console.log('Analysis completed successfully:', data);
    return data;

  } catch (error) {
    console.error('Analysis API error:', error);
    throw error;
  }
};
