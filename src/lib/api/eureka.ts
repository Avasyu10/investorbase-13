
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
    // Use the specific user ID for all Eureka form submissions
    const submissionData = {
      ...data,
      user_id: "ba8610ea-1e0c-49f9-ae5a-86aae1f6d1af", // Fixed user ID for all Eureka submissions
      analysis_status: 'pending'
    };
    
    console.log('📋 Final submission data being sent to database:', submissionData);
    
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error submitting Eureka form:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!submission) {
      throw new Error('No submission data returned from database');
    }

    console.log('✅ Eureka form submitted successfully:', submission);
    
    // Return immediately - analysis will be triggered by database trigger
    return submission;
  } catch (error: any) {
    console.error('❌ Failed to submit Eureka form:', error);
    throw error;
  }
};
