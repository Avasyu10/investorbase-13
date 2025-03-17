
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Calling analyze-pdf function with report ID:', reportId);
    
    // Add validation for reportId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!reportId || !uuidRegex.test(reportId)) {
      const errorMessage = `Invalid report ID format: ${reportId}`;
      console.error(errorMessage);
      
      toast({
        id: "invalid-report-id",
        title: "Invalid Report ID",
        description: "The report ID format is invalid. Please try again with a valid report.",
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    // Call the edge function with a timeout setting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      // Call the edge function without authentication but with a signal for timeout
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: { reportId },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error invoking analyze-pdf function:', error);
        
        let errorMessage = "There was a problem analyzing the report";
        
        // Check if we have a more specific error message
        if (error.message?.includes('non-2xx status code')) {
          errorMessage = "The analysis function returned an error. Please try again later.";
        } else if (error.message?.includes('aborted')) {
          errorMessage = "The analysis timed out. Your PDF might be too large or complex.";
        }
        
        // Use a unique toast ID to prevent duplicate toasts
        toast({
          id: "analysis-error-1",
          title: "Analysis failed",
          description: errorMessage,
          variant: "destructive"
        });
        
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during analysis";
        console.error('API returned error:', errorMessage);
        
        let userMessage = errorMessage;
        
        // Make error messages more user-friendly
        if (errorMessage.includes('belongs to another user') || errorMessage.includes('access denied')) {
          userMessage = "You don't have permission to analyze this report.";
        } else if (errorMessage.includes('not found')) {
          userMessage = "The report could not be found. It may have been deleted.";
        } else if (errorMessage.includes('PDF file is empty')) {
          userMessage = "The PDF file appears to be corrupted or empty.";
        } else if (errorMessage.includes('Invalid report ID format')) {
          userMessage = "The report ID format is invalid.";
        }
        
        // Use a unique toast ID to prevent duplicate toasts
        toast({
          id: "analysis-error-2",
          title: "Analysis failed",
          description: userMessage,
          variant: "destructive"
        });
        
        throw new Error(errorMessage);
      }
      
      console.log('Analysis result:', data);
      
      toast({
        id: "analysis-success",
        title: "Analysis complete",
        description: "Your pitch deck has been successfully analyzed",
      });
      
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Analysis request timed out');
        throw new Error('Analysis timed out. The PDF might be too large or complex.');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Prevent duplicate toasts by checking error message
    // Use a unique toast ID to prevent duplicate toasts
    if (!errorMessage.includes("analysis failed")) {
      toast({
        id: "analysis-error-3",
        title: "Analysis failed",
        description: "Could not analyze the report. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}
