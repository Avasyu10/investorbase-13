
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
    // Ensure user_id is included in the submission with proper null handling
    const submissionData = {
      ...data,
      user_id: data.user_id || null, // Explicitly handle null case
      founder_linkedin_urls: data.founder_linkedin_urls || [], // Ensure array is not undefined
      company_registration_type: data.company_registration_type || 'Not Specified'
    };
    
    console.log('📋 Final submission data being sent:', submissionData);
    
    // Use a more direct approach to avoid timeout issues
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select('id, company_name, submitter_email, created_at')
      .single();

    if (error) {
      console.error('❌ Database error submitting Eureka form:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!submission) {
      throw new Error('No submission data returned from database');
    }

    console.log('✅ Eureka form submitted successfully:', submission);
    return submission;
    
  } catch (error: any) {
    console.error('❌ Error in submitEurekaForm:', error);
    
    // Provide more specific error messages
    if (error.code === '57014') {
      throw new Error('Request timeout - please try again');
    } else if (error.code === '23505') {
      throw new Error('Duplicate submission detected');
    } else if (error.message?.includes('invalid column')) {
      throw new Error('Database configuration error - please contact support');
    }
    
    throw error;
  }
};
