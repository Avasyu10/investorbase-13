
import { supabase } from "@/integrations/supabase/client";

export interface EurekaSubmissionData {
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
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
  user_id?: string | null;
}

export const submitEurekaForm = async (data: EurekaSubmissionData) => {
  console.log('📤 Submitting Eureka form data:', data);
  
  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 Current user from auth:', user?.id);
    
    // Prepare submission data with proper user_id handling
    const submissionData = {
      ...data,
      user_id: user?.id || null // Set to authenticated user ID or null for anonymous
    };
    
    console.log('📋 Final submission data being sent:', submissionData);
    
    // Insert the submission with proper error handling
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Submission failed: ${error.message}`);
    }

    if (!submission) {
      throw new Error('No submission data returned from database');
    }

    console.log('✅ Eureka form submitted successfully - analysis will start automatically via trigger:', submission);
    return submission;
    
  } catch (error: any) {
    console.error('❌ Error in submitEurekaForm:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('user_id')) {
      throw new Error('Authentication error. Please try refreshing the page and submitting again.');
    }
    if (error.message?.includes('timeout')) {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (error.message?.includes('permission')) {
      throw new Error('Permission denied. Please ensure you have access to submit forms.');
    }
    
    // Re-throw the original error for other cases
    throw error;
  }
};
