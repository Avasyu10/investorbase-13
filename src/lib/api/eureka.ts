
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
  console.log('🔗 SUPABASE API CALL STARTED');
  console.log('📤 submitEurekaForm called with data:', data);
  console.log('📤 Data structure validation:');
  console.log('  - form_slug:', typeof data.form_slug, '=', data.form_slug);
  console.log('  - company_name:', typeof data.company_name, '=', data.company_name);
  console.log('  - submitter_email:', typeof data.submitter_email, '=', data.submitter_email);
  console.log('  - user_id:', typeof data.user_id, '=', data.user_id);
  console.log('  - founder_linkedin_urls length:', data.founder_linkedin_urls?.length);
  
  // Ensure user_id is included in the submission
  const submissionData = {
    ...data,
    user_id: data.user_id || null
  };
  
  console.log('📤 Final submission data to Supabase:', submissionData);
  console.log('🚀 Calling supabase.from("eureka_form_submissions").insert()...');
  
  try {
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('💥 SUPABASE INSERT ERROR:');
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Error submitting Eureka form:', error);
      throw error;
    }

    console.log('🎉 SUPABASE INSERT SUCCESSFUL!');
    console.log('✅ Eureka form submitted successfully - analysis will start automatically via trigger');
    console.log('✅ Submission data returned from Supabase:', submission);
    console.log('✅ Submission ID:', submission?.id);
    console.log('✅ Created at:', submission?.created_at);
    console.log('✅ Analysis status:', submission?.analysis_status);
    
    return submission;
  } catch (error) {
    console.error('💥 EXCEPTION IN submitEurekaForm:');
    console.error('❌ Exception type:', typeof error);
    console.error('❌ Exception:', error);
    console.error('❌ Exception message:', (error as any)?.message);
    console.error('❌ Exception stack:', (error as any)?.stack);
    throw error;
  }
};

// Remove the analyzeEurekaSubmission function since analysis is now automatic via trigger
