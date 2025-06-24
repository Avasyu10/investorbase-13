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
    // Get current user if available, otherwise allow anonymous submission
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    
    console.log('👤 Using user ID:', userId);
    
    // Prepare submission data - keep it simple
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
      user_id: userId,
      analysis_status: 'pending'
    };
    
    console.log('📋 Submitting data:', submissionData);
    
    // Simple direct insertion without complex error handling
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Submission failed: ${error.message}`);
    }

    if (!submission) {
      throw new Error('No data returned from submission');
    }

    console.log('✅ Form submitted successfully:', submission);
    return submission;
    
  } catch (error: any) {
    console.error('❌ Submission error:', error);
    throw new Error(error.message || 'Submission failed. Please try again.');
  }
};
