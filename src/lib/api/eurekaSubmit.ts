
import { supabase } from "@/integrations/supabase/client";

export interface EurekaFormData {
  idea_id: string;
  eureka_id: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  question_6?: string;
  question_7?: string;
  question_8?: string;
  question_9?: string;
  // Include other existing fields from the interface
  form_slug?: string;
  company_name?: string;
  company_registration_type?: string;
  executive_summary?: string;
  company_type?: string;
  submitter_email?: string;
  founder_linkedin_urls?: string[];
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
}

export interface EurekaSubmitResponse {
  success: boolean;
  submissionId?: string;
  companyId?: string;
  isNewCompany?: boolean;
  analysisResult?: any;
  message?: string;
  error?: string;
}

export const submitEurekaForm = async (formData: EurekaFormData): Promise<EurekaSubmitResponse> => {
  console.log('📤 Submitting Eureka form data:', formData);
  
  try {
    const { data: response, error } = await supabase.functions.invoke('submit-and-analyze-eureka-form', {
      body: formData
    });

    if (error) {
      console.error('❌ Error calling submit-and-analyze-eureka-form function:', error);
      throw new Error(`Function error: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response data returned from function');
    }

    console.log('✅ Eureka form submitted successfully:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Failed to submit Eureka form:', error);
    throw error;
  }
};
