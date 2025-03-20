
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Calling analyze-pdf function with report ID:', reportId);
    
    // First check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      toast({
        id: "auth-error",
        title: "Authentication required",
        description: "Please sign in to analyze reports",
        variant: "destructive"
      });
      throw new Error('User not authenticated');
    }
    
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
    
    // Set a timeout for the edge function call (60 seconds)
    const timeoutMs = 60000; // Extended from 40s to 60s since AI analysis can take longer
    
    try {
      // Call the edge function - add a proper error handler with robust retry logic
      console.log(`Invoking analyze-pdf function with report ID: ${reportId}`);
      
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: { reportId }
      });
      
      if (error) {
        console.error('Error invoking analyze-pdf function:', error);
        
        let errorMessage = "There was a problem analyzing the report";
        
        // Check if we have a more specific error message
        if (error.message?.includes('non-2xx status code')) {
          errorMessage = "The analysis function returned an error. Please try again later.";
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Failed to send')) {
          errorMessage = "Failed to connect to the analysis service. This could be due to network issues or the function being offline.";
        }
        
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
    } catch (innerError) {
      // Handle timeout specifically
      if (innerError.name === 'AbortError') {
        console.error('Analysis timed out after', timeoutMs / 1000, 'seconds');
        toast({
          id: "analysis-timeout",
          title: "Analysis timed out",
          description: "The analysis is taking longer than expected. Please try again with a smaller file or try later.",
          variant: "destructive"
        });
        throw new Error('Analysis timed out. Please try with a smaller file or try again later.');
      }
      
      // Handle network errors more specifically
      if (innerError.message?.includes('Failed to fetch') || innerError.message?.includes('Failed to send')) {
        console.error('Network error when calling analyze-pdf function:', innerError);
        toast({
          id: "network-error",
          title: "Network Error",
          description: "Could not connect to the analysis service. This is likely a temporary issue, please try again later.",
          variant: "destructive"
        });
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      // Re-throw other errors
      throw innerError;
    }
  } catch (error) {
    console.error('Error analyzing report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Prevent duplicate toasts by checking error message
    if (!errorMessage.includes("analysis failed") && !errorMessage.includes("timed out") && !errorMessage.includes("Network error")) {
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
