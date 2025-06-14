
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
