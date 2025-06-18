
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
  
  // Ensure user_id is included in the submission
  const submissionData = {
    ...data,
    user_id: data.user_id || null
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

  console.log('✅ Eureka form submitted successfully:', submission);
  return submission;
};

export const analyzeEurekaSubmission = async (submissionId: string) => {
  console.log('🔬 Starting Eureka submission analysis for:', submissionId);
  
  try {
    // Call the correct analyze-eureka-form function (just like analyze-barc-form)
    const response = await fetch('/functions/v1/analyze-eureka-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId }),
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🎯 Eureka analysis completed successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error analyzing Eureka submission:', error);
    throw error;
  }
};
