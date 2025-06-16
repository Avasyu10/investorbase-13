
import { supabase } from "@/integrations/supabase/client";

export interface BarcSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type: string;
  executive_summary: string;
  company_type: string;
  company_linkedin_url?: string;
  question_1: string;
  question_2: string;
  question_3: string;
  question_4: string;
  question_5: string;
  submitter_email: string;
  founder_linkedin_urls: string[];
  poc_name: string;
  phoneno: string;
}

export const submitBarcForm = async (data: BarcSubmissionData) => {
  console.log('🚀 Submitting BARC form with data:', data);

  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  
  console.log('👤 Current user for submission:', { userId, email: user?.email });

  const submissionPayload = {
    form_slug: data.form_slug,
    company_name: data.company_name,
    company_registration_type: data.company_registration_type,
    executive_summary: data.executive_summary,
    company_type: data.company_type,
    company_linkedin_url: data.company_linkedin_url || null,
    question_1: data.question_1,
    question_2: data.question_2,
    question_3: data.question_3,
    question_4: data.question_4,
    question_5: data.question_5,
    submitter_email: data.submitter_email,
    founder_linkedin_urls: data.founder_linkedin_urls,
    poc_name: data.poc_name,
    phoneno: data.phoneno,
    user_id: userId,
    analysis_status: 'pending'
  };

  console.log('📋 Final submission payload to be inserted:', submissionPayload);

  const { data: submission, error } = await supabase
    .from('barc_form_submissions')
    .insert(submissionPayload)
    .select()
    .single();

  if (error) {
    console.error('❌ Error submitting BARC form:', error);
    throw error;
  }

  console.log('✅ BARC form submitted successfully:', submission);
  
  // If there's a company LinkedIn URL, trigger the scraping
  if (data.company_linkedin_url && data.company_linkedin_url.trim()) {
    try {
      console.log('🔍 Triggering company LinkedIn scraping for:', data.company_linkedin_url);
      
      const { data: scrapeResponse, error: scrapeError } = await supabase.functions.invoke('scraped_company_details', {
        body: { 
          linkedInUrl: data.company_linkedin_url,
          companyId: submission.id // Use submission ID as company reference
        }
      });

      if (scrapeError) {
        console.error('❌ Error during company scraping:', scrapeError);
        // Don't throw here as we still want the form submission to succeed
      } else {
        console.log('✅ Company scraping initiated successfully:', scrapeResponse);
      }
    } catch (error) {
      console.error('💥 Error invoking company scraping function:', error);
      // Don't throw here as we still want the form submission to succeed
    }
  }

  return submission;
};

export const analyzeBarcSubmission = async (submissionId: string) => {
  console.log('🔧 Starting BARC submission analysis for:', submissionId);

  try {
    // Call the analyze-barc-form edge function directly
    console.log('🚀 Invoking analyze-barc-form edge function...');
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });

    if (error) {
      console.error('❌ Error calling analyze-barc-form function:', error);
      throw error;
    }

    console.log('✅ BARC analysis completed successfully:', data);
    
    return {
      success: true,
      companyId: data?.companyId,
      message: data?.message || 'Analysis completed successfully'
    };
  } catch (error) {
    console.error('💥 Error in analyzeBarcSubmission:', error);
    throw error;
  }
};

export const scrapeCompanyLinkedIn = async (linkedInUrl: string, companyId: string) => {
  console.log('🔍 Starting company LinkedIn scraping for:', { linkedInUrl, companyId });

  try {
    const { data, error } = await supabase.functions.invoke('scraped_company_details', {
      body: { 
        linkedInUrl: linkedInUrl,
        companyId: companyId
      }
    });

    if (error) {
      console.error('❌ Error calling scraped_company_details function:', error);
      throw error;
    }

    console.log('✅ Company scraping completed successfully:', data);
    
    return {
      success: true,
      data: data,
      message: data?.message || 'Company scraping completed successfully'
    };
  } catch (error) {
    console.error('💥 Error in scrapeCompanyLinkedIn:', error);
    throw error;
  }
};
