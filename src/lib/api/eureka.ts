
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

// The specific user ID for iframe submissions
const IFRAME_USER_ID = 'ba8610ea-1e0c-49f9-ae5a-86aae1f6d1af';

export const submitEurekaForm = async (data: EurekaSubmissionData) => {
  console.log('📤 Submitting Eureka form data:', data);
  
  try {
    // Check if we're in an iframe context
    const isInIframe = window.self !== window.top;
    console.log('🖼️ Is in iframe context:', isInIframe);
    
    let finalUserId: string | null;
    
    if (isInIframe) {
      // If in iframe, always use the specific user ID
      finalUserId = IFRAME_USER_ID;
      console.log('📝 Using iframe user ID:', finalUserId);
    } else {
      // If not in iframe, get current authenticated user or null for anonymous
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id || null;
      console.log('👤 Using authenticated user ID or anonymous:', finalUserId);
    }
    
    // Prepare submission data with proper user_id handling
    const submissionData = {
      form_slug: data.form_slug,
      company_name: data.company_name,
      company_registration_type: data.company_registration_type,
      executive_summary: data.executive_summary,
      company_type: data.company_type,
      question_1: data.question_1,
      question_2: data.question_2,
      question_3: data.question_3,
      question_4: data.question_4,
      question_5: data.question_5,
      submitter_email: data.submitter_email,
      founder_linkedin_urls: data.founder_linkedin_urls,
      poc_name: data.poc_name,
      phoneno: data.phoneno,
      company_linkedin_url: data.company_linkedin_url,
      user_id: finalUserId
    };
    
    console.log('📋 Final submission data being sent:', submissionData);
    
    // Insert the submission with the user_id properly set
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insertion error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        submissionData
      });
      
      throw new Error(`Database insertion failed: ${error.message}. Please try again.`);
    }

    if (!submission) {
      throw new Error('Submission was created but no data was returned. Please contact support.');
    }

    console.log('✅ Eureka form submitted successfully:', submission);
    
    // Add a small delay to ensure the submission is fully committed before any analysis starts
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return submission;
    
  } catch (error: any) {
    console.error('❌ Error in submitEurekaForm:', error);
    
    // Provide more specific error messages based on the actual error
    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (error.message?.includes('permission') || error.message?.includes('denied')) {
      throw new Error('Access denied. Please refresh the page and try again.');
    }
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      throw new Error('Database configuration error. Please contact support.');
    }
    if (error.message?.includes('Database insertion failed')) {
      // Re-throw database errors as-is since they're already formatted
      throw error;
    }
    
    // For any other errors, provide a generic message
    throw new Error('An unexpected error occurred. Please try again or contact support if the problem persists.');
  }
};
