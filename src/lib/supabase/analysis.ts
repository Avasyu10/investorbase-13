
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
    
    // Check if this is a public submission, email submission, or standard report
    const isEmailSubmission = reportData.pdf_url && reportData.pdf_url.includes('email_attachments/');
    const isPublicSubmission = reportData.is_public_submission || false;
    
    console.log(`Report type: ${isPublicSubmission ? 'Public submission' : (isEmailSubmission ? 'Email submission' : 'Standard report')}`);
    
    // For public submissions, always use analyze-public-pdf regardless of source
    const functionName = isPublicSubmission ? 'analyze-public-pdf' : 'analyze-pdf';
    console.log(`Using function: ${functionName} for analysis`);
    
    // Before making the request, update the report status to processing
    await supabase
      .from('reports')
      .update({
        analysis_status: 'processing'
      })
      .eq('id', reportId);
    
    // Call the appropriate edge function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: JSON.stringify({ 
        reportId,
        isEmailSubmission 
      }),
    });
    
    if (error) {
      console.error(`Error invoking ${functionName} function:`, error);
      
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
      .select('analysis_status, pdf_url, is_public_submission')
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
    
    // Update the report status to processing
    await supabase
      .from('reports')
      .update({
        analysis_status: 'processing'
      })
      .eq('id', reportId);
    
    // Always use analyze-public-pdf for auto-analysis since we're dealing with public submissions
    const { data, error } = await supabase.functions.invoke('analyze-public-pdf', {
      body: JSON.stringify({ reportId }),
    });
    
    if (error) {
      console.error('Error in auto-analysis:', error);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message
        })
        .eq('id', reportId);
        
      return false;
    }
    
    console.log('Auto-analysis initiated successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in autoAnalyzePublicReport:', error);
    
    // Try to update the report status to failed
    try {
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', reportId);
    } catch (updateError) {
      console.error('Failed to update report status after analysis error:', updateError);
    }
    
    return false;
  }
}
