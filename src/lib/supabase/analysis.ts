
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // Get the report info first to determine the source
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      console.error('Error getting report data:', reportError);
      throw reportError;
    }
    
    // Check if this is a public submission or email submission
    const isEmailSubmission = reportData.pdf_url && reportData.pdf_url.includes('email_attachments/');
    console.log(`Report type: ${isEmailSubmission ? 'Email submission' : 'Standard report'}`);
    
    // Call the analyze-pdf edge function
    const { data, error } = await supabase.functions.invoke('analyze-pdf', {
      body: JSON.stringify({ 
        reportId,
        isEmailSubmission 
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
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
    
    // Show a toast with a friendly error message
    toast({
      title: "Analysis failed",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive"
    });
    
    throw error;
  }
}

// Function for auto-analyzing public reports (used in useCompanyDetails.ts)
export async function autoAnalyzePublicReport(reportId: string) {
  try {
    console.log('Auto-analyzing public report:', reportId);
    
    // Check if the report exists and has a valid status for analysis
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('analysis_status, pdf_url')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      console.error('Error getting report data for auto-analysis:', reportError);
      return false;
    }
    
    // Only proceed if report is in pending status
    if (reportData.analysis_status !== 'pending') {
      console.log(`Report ${reportId} is already in ${reportData.analysis_status} status. Skipping auto-analysis.`);
      return false;
    }
    
    // Determine if this is an email submission
    const isEmailSubmission = reportData.pdf_url && reportData.pdf_url.includes('email_attachments/');
    
    // Call the analyze-public-pdf function instead of analyze-pdf
    const { data, error } = await supabase.functions.invoke('analyze-public-pdf', {
      body: JSON.stringify({ 
        reportId,
        isEmailSubmission
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (error) {
      console.error('Error in auto-analysis:', error);
      return false;
    }
    
    console.log('Auto-analysis initiated successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in autoAnalyzePublicReport:', error);
    return false;
  }
}
