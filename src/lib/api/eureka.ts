
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
    // FIXED: Use the specific user ID for all Eureka form submissions, same as BARC
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
    
    // Give a small delay to ensure the record is committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Manually trigger analysis since the database trigger is having issues
    try {
      console.log('🔄 Manually triggering analysis for submission:', submission.id);
      
      const { error: analysisError } = await supabase.functions.invoke('analyze-eureka-form', {
        body: { submissionId: submission.id }
      });
      
      if (analysisError) {
        console.error('⚠️ Analysis trigger failed, but submission was successful:', analysisError);
        // Don't throw here - the submission was successful, analysis can be retried later
      } else {
        console.log('✅ Analysis triggered successfully');
      }
    } catch (analysisError) {
      console.error('⚠️ Failed to trigger analysis, but submission was successful:', analysisError);
      // Don't throw here - the submission was successful
    }
    
    return submission;
  } catch (error: any) {
    console.error('❌ Failed to submit Eureka form:', error);
    throw error;
  }
};
