
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
  analysis_status?: string;
}

export const submitEurekaForm = async (data: EurekaSubmissionData) => {
  console.log('📤 Submitting Eureka form data:', data);
  
  // Ensure the submission includes the analysis_status field
  const submissionData = {
    ...data,
    analysis_status: 'pending', // Explicitly set status to pending
    user_id: data.user_id || null // Ensure user_id is properly handled
  };
  
  const { data: submission, error } = await supabase
    .from('eureka_form_submissions')
    .insert([submissionData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error submitting Eureka form:', error);
    throw error;
  }

  console.log('✅ Eureka form submitted successfully - analysis will start automatically via trigger:', submission);
  return submission;
};
