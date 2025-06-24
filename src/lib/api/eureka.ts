
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
  console.log('🔗 SUPABASE API CALL STARTED (PUBLIC MODE)');
  console.log('📤 submitEurekaForm called with data:', data);
  
  // Ensure user_id is handled properly for public submissions
  const submissionData = {
    ...data,
    user_id: data.user_id || null // Allow null for public submissions
  };
  
  console.log('📤 Final PUBLIC submission data to Supabase:', submissionData);
  console.log('🚀 Calling supabase.from("eureka_form_submissions").insert()...');
  
  try {
    // Insert the submission - this should work for public submissions
    const { data: submission, error } = await supabase
      .from('eureka_form_submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('💥 SUPABASE INSERT ERROR:');
      console.error('❌ Error:', error);
      throw error;
    }

    console.log('🎉 SUPABASE INSERT SUCCESSFUL!');
    console.log('✅ Submission data returned from Supabase:', submission);
    
    // Wait a bit longer before triggering analysis to ensure transaction is committed
    console.log('⏳ Waiting 3 seconds before triggering analysis...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Now trigger the analysis with proper error handling
    try {
      console.log('🔍 Triggering analysis for PUBLIC submission:', submission.id);
      
      const analysisResponse = await fetch(
        'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-eureka-submission',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            submissionId: submission.id,
            submission_id: submission.id // Include both formats for compatibility
          }),
        }
      );

      const analysisResult = await analysisResponse.json();
      console.log('📊 Analysis trigger response:', analysisResult);
      
      if (!analysisResponse.ok) {
        console.warn('⚠️ Analysis trigger failed, but PUBLIC submission was successful:', analysisResult);
        // Don't throw here - submission was successful, analysis can be retried later
      } else {
        console.log('✅ Analysis triggered successfully for PUBLIC submission');
      }
    } catch (analysisError) {
      console.warn('⚠️ Analysis trigger failed, but PUBLIC submission was successful:', analysisError);
      // Don't throw here - submission was successful, analysis can be retried later
    }
    
    return submission;
  } catch (error) {
    console.error('💥 EXCEPTION IN submitEurekaForm (PUBLIC MODE):');
    console.error('❌ Exception:', error);
    throw error;
  }
};
