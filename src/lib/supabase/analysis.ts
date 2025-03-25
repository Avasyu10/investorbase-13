
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // First, fetch the report to determine its source
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('source, pdf_url')
      .eq('id', reportId)
      .maybeSingle();
      
    if (reportError) {
      console.error('Error fetching report details:', reportError);
      throw new Error('Could not determine report source');
    }
    
    // Determine if this is an email submission based on source or file path
    const isEmailSubmission = report?.source === 'email' || 
                             (report?.pdf_url && report.pdf_url.includes('email_attachments'));
                             
    console.log('Report source check:', {
      reportId,
      source: report?.source,
      pdfUrl: report?.pdf_url,
      isEmailSubmission
    });
    
    // Use the appropriate edge function based on the source
    const functionName = isEmailSubmission ? 'analyze-public-pdf' : 'analyze-pdf';
    
    console.log(`Calling ${functionName} edge function`);
    
    // Call the analyze-pdf edge function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { reportId }
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
    throw error;
  }
}
