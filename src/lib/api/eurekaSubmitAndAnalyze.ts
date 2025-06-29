
import { supabase } from "@/integrations/supabase/client";

export interface EurekaSubmitAndAnalyzeData {
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
  question_6?: string;
  question_7?: string;
  question_8?: string;
  question_9?: string;
  submitter_email: string;
  founder_linkedin_urls?: string[];
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
  idea_id?: string;
  eureka_id?: string;
}

export interface EurekaSubmitAndAnalyzeResponse {
  success: boolean;
  submissionId?: string;
  companyId?: string;
  isNewCompany?: boolean;
  analysisResult?: any;
  message?: string;
  error?: string;
}

export const submitAndAnalyzeEurekaForm = async (data: EurekaSubmitAndAnalyzeData): Promise<EurekaSubmitAndAnalyzeResponse> => {
  console.log('📤 Submitting and analyzing Eureka form data:', data);
  
  try {
    const { data: response, error } = await supabase.functions.invoke('submit-and-analyze-eureka-form', {
      body: data
    });

    if (error) {
      console.error('❌ Error calling submit-and-analyze-eureka-form function:', error);
      throw new Error(`Function error: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response data returned from function');
    }

    console.log('✅ Eureka form submitted and analyzed successfully:', response);
    return response;
  } catch (error: any) {
    console.error('❌ Failed to submit and analyze Eureka form:', error);
    throw error;
  }
};
