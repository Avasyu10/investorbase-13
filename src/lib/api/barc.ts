
import { supabase } from "@/integrations/supabase/client";

export interface BarcAnalysisResult {
  overall_score: number;
  recommendation: 'Accept' | 'Consider' | 'Reject';
  strengths: string[];
  weaknesses: string[];
  market_potential: 'High' | 'Medium' | 'Low';
  team_assessment: 'Strong' | 'Moderate' | 'Weak';
  business_model_viability: 'High' | 'Medium' | 'Low';
  financial_projections?: 'Realistic' | 'Optimistic' | 'Concerning';
  detailed_analysis: string;
  key_risks?: string[];
  next_steps?: string[];
}

export interface BarcSubmissionData {
  form_slug: string;
  company_name: string;
  company_registration_type: string;
  executive_summary: string;
  company_type: string;
  company_linkedin_url?: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  submitter_email: string;
  founder_linkedin_urls?: string[];
}

export async function submitBarcForm(submissionData: BarcSubmissionData) {
  try {
    console.log('Submitting BARC form:', submissionData);
    
    // Insert the submission into the database
    const { data, error } = await supabase
      .from('barc_form_submissions')
      .insert({
        form_slug: submissionData.form_slug,
        company_name: submissionData.company_name,
        company_registration_type: submissionData.company_registration_type,
        executive_summary: submissionData.executive_summary,
        company_type: submissionData.company_type,
        company_linkedin_url: submissionData.company_linkedin_url,
        question_1: submissionData.question_1,
        question_2: submissionData.question_2,
        question_3: submissionData.question_3,
        question_4: submissionData.question_4,
        question_5: submissionData.question_5,
        submitter_email: submissionData.submitter_email,
        founder_linkedin_urls: submissionData.founder_linkedin_urls,
        analysis_status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error submitting BARC form:', error);
      throw new Error(error.message || 'Failed to submit BARC form');
    }
    
    console.log('BARC form submitted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in submitBarcForm:', error);
    throw error;
  }
}

export async function analyzeBarcSubmission(submissionId: string) {
  try {
    console.log('Starting BARC submission analysis for:', submissionId);
    
    // Call the analyze-barc-form edge function
    const { data, error } = await supabase.functions.invoke('analyze-barc-form', {
      body: { submissionId }
    });
    
    if (error) {
      console.error('Error calling analyze-barc-form function:', error);
      throw new Error(error.message || 'Failed to analyze BARC submission');
    }
    
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Analysis failed';
      console.error('Analysis function returned error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('BARC analysis completed successfully');
    return data;
  } catch (error) {
    console.error('Error in analyzeBarcSubmission:', error);
    throw error;
  }
}
