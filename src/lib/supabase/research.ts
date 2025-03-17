
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function getLatestResearch(companyId: string, assessmentText: string) {
  try {
    console.log('Calling research-with-perplexity function with company ID:', companyId);
    
    // Validate input parameters
    if (!companyId || !assessmentText) {
      const errorMessage = `Invalid parameters: companyId or assessmentText is missing`;
      console.error(errorMessage);
      
      toast({
        id: "invalid-research-params",
        title: "Invalid Research Parameters",
        description: "The research request is missing required parameters.",
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    // Set a longer timeout for the edge function call (90 seconds)
    const timeoutMs = 90000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Call the edge function with abort controller
      const { data, error } = await supabase.functions.invoke('research-with-perplexity', {
        body: { 
          companyId,
          assessmentText
        }
      });
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error invoking research-with-perplexity function:', error);
        
        toast({
          id: "research-error-1",
          title: "Research failed",
          description: "There was a problem fetching the latest research.",
          variant: "destructive"
        });
        
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during research";
        console.error('API returned error:', errorMessage);
        
        toast({
          id: "research-error-2",
          title: "Research failed",
          description: "The research service could not process your request.",
          variant: "destructive"
        });
        
        throw new Error(errorMessage);
      }
      
      console.log('Research result:', data);
      
      toast({
        id: "research-success",
        title: "Research complete",
        description: "Latest market research has been loaded successfully",
      });
      
      return data;
    } catch (innerError) {
      // Clear the timeout to prevent potential memory leaks
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (innerError.name === 'AbortError') {
        console.error('Research timed out after', timeoutMs / 1000, 'seconds');
        toast({
          id: "research-timeout",
          title: "Research timed out",
          description: "The research is taking longer than expected. Please try again later.",
          variant: "destructive"
        });
        throw new Error('Research timed out. Please try again later.');
      }
      
      // If it's a network error (like 'failed to fetch'), handle it gracefully
      if (innerError.message && innerError.message.includes('fetch')) {
        console.error('Network error when calling research function:', innerError);
        toast({
          id: "research-network-error",
          title: "Network error",
          description: "Could not connect to the research service. Please check your internet connection and try again.",
          variant: "destructive"
        });
        throw new Error('Network error when calling research function. Please try again later.');
      }
      
      // Re-throw other errors
      throw innerError;
    }
  } catch (error) {
    console.error('Error getting latest research:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Prevent duplicate toasts by checking error message
    if (!errorMessage.includes("research failed") && !errorMessage.includes("timed out")) {
      toast({
        id: "research-error-3",
        title: "Research failed",
        description: "Could not retrieve the latest research. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}
