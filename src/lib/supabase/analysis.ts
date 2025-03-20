
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
      // Call the edge function with proper error handling and retries
      console.log(`Invoking analyze-pdf function with report ID: ${reportId}`);
      
      // Implement retry logic
      let retryCount = 0;
      const maxRetries = 3; // Increased from 2 to 3 for production
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount} for analyze-pdf function`);
            // Add a short delay between retries that increases with each attempt
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
          
          // Call the edge function
          const { data, error } = await supabase.functions.invoke('analyze-pdf', {
            body: { reportId },
            // Set a longer timeout for production environments
            timeout: timeoutMs
          });
          
          if (error) {
            console.error('Error invoking analyze-pdf function:', error);
            lastError = error;
            
            // Check if this is a recoverable error
            if (error.message?.includes('Failed to fetch') || 
                error.message?.includes('Failed to send') ||
                error.message?.includes('network') ||
                error.message?.includes('timeout')) {
              
              // This is a network error, we can retry
              retryCount++;
              continue;
            }
            
            // For non-network errors, throw immediately
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
        } catch (retryError) {
          lastError = retryError;
          
          // Only retry on network errors
          if (retryError.message?.includes('Failed to fetch') || 
              retryError.message?.includes('Failed to send') ||
              retryError.message?.includes('network') ||
              retryError.message?.includes('timeout') ||
              retryError.message?.includes('Connection')) {
            
            retryCount++;
            if (retryCount <= maxRetries) {
              console.log(`Will retry due to network error: ${retryError.message}`);
              continue;
            }
          }
          
          // If it's not a network error or we've exhausted retries, throw the error
          throw retryError;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('Failed to invoke analyze-pdf function after multiple attempts');
    } catch (innerError) {
      // Check if this is a CORS error
      if (innerError.message?.includes('CORS') || innerError.name === 'TypeError') {
        console.error('Possible CORS or network configuration issue:', innerError);
        toast({
          id: "cors-error",
          title: "Connection Error",
          description: "Could not connect to the analysis service due to a network configuration issue. Please contact support.",
          variant: "destructive"
        });
        throw new Error('Network configuration error. Please contact support.');
      }
      
      // Handle timeout specifically
      if (innerError.name === 'AbortError' || innerError.message?.includes('timeout')) {
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
      if (innerError.message?.includes('Failed to fetch') || 
          innerError.message?.includes('Failed to send') ||
          innerError.message?.includes('network') ||
          innerError.message?.includes('Connection')) {
        
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
    if (!errorMessage.includes("analysis failed") && 
        !errorMessage.includes("timed out") && 
        !errorMessage.includes("Network error") &&
        !errorMessage.includes("Connection")) {
      
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
