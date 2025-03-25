
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Helper function to analyze a report
export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // Call the analyze-pdf edge function
    const { data, error } = await supabase.functions.invoke('analyze-pdf', {
      body: { reportId }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf function:', error);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message
        })
        .eq('id', reportId);
        
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: errorMessage
        })
        .eq('id', reportId);
        
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    // Update report status to completed
    await supabase
      .from('reports')
      .update({
        analysis_status: 'completed',
        company_id: data.companyId
      })
      .eq('id', reportId);
    
    return data;
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}

// Helper function to check if a submission is already being analyzed or has already been analyzed
export async function checkAnalysisStatus(reportId: string) {
  try {
    console.log('Checking analysis status for report:', reportId);
    
    const { data, error } = await supabase
      .from('reports')
      .select('analysis_status, analysis_error, company_id')
      .eq('id', reportId)
      .single();
      
    if (error) {
      console.error('Error checking analysis status:', error);
      return { status: 'unknown', error: error.message };
    }
    
    console.log('Analysis status for report:', data);
    
    return {
      status: data.analysis_status,
      error: data.analysis_error,
      companyId: data.company_id
    };
  } catch (error) {
    console.error('Error checking analysis status:', error);
    return { status: 'unknown', error: 'Error checking analysis status' };
  }
}
