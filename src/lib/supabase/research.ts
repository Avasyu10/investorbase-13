
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function getLatestResearch(companyId: string, assessmentText: string) {
  try {
    console.log('Calling research-with-perplexity function with company ID:', companyId);
    
    // Validate input parameters
    if (!companyId || !assessmentText) {
      const errorMessage = `Invalid parameters: companyId or assessmentText is missing`;
      console.error(errorMessage);
      
      toast.error("Invalid Research Parameters", {
        id: "invalid-research-params",
        description: "The research request is missing required parameters."
      });
      
      throw new Error(errorMessage);
    }
    
    // First check if we already have the latest data in the database
    const { data: existingData, error: existingError } = await supabase
      .from('companies')
      .select('perplexity_response, perplexity_requested_at')
      .eq('id', companyId)
      .maybeSingle();
      
    if (!existingError && existingData?.perplexity_response) {
      // If we already have recent data (less than 10 minutes old), return it immediately
      const requestedAt = existingData.perplexity_requested_at ? new Date(existingData.perplexity_requested_at) : null;
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      if (requestedAt && requestedAt > tenMinutesAgo) {
        console.log('Using existing research data from database (less than 10 minutes old)');
        return {
          research: existingData.perplexity_response,
          requestedAt: existingData.perplexity_requested_at
        };
      }
    }
    
    // Set a timeout for the edge function call (60 seconds)
    const timeoutMs = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Call the edge function with abort controller
      const { data, error } = await supabase.functions.invoke('real-time-perplexity-research', {
        body: { 
          companyId,
          assessmentPoints: assessmentText.split('\n\n').filter(point => point.trim() !== '')
        }
      });
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error invoking research-with-perplexity function:', error);
        
        // If we have existing data, return it instead of failing but don't show an error toast
        if (existingData?.perplexity_response) {
          console.log('Falling back to existing research data due to edge function error');
          return {
            research: existingData.perplexity_response,
            requestedAt: existingData.perplexity_requested_at
          };
        }
        
        // Only throw the error, don't show toast (toast will be shown in the component)
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during research";
        console.error('API returned error:', errorMessage);
        
        // If we have existing data, return it instead of failing but don't show an error toast
        if (existingData?.perplexity_response) {
          console.log('Falling back to existing research data due to API error');
          return {
            research: existingData.perplexity_response,
            requestedAt: existingData.perplexity_requested_at
          };
        }
        
        // Only throw the error, don't show toast (toast will be shown in the component)
        throw new Error(errorMessage);
      }
      
      console.log('Research result:', data);
      
      // Fetch the freshest data from the database after the function completes
      // This ensures we have the most up-to-date perplexity_response
      const { data: updatedCompany, error: companyError } = await supabase
        .from('companies')
        .select('perplexity_response, perplexity_requested_at')
        .eq('id', companyId)
        .maybeSingle();
        
      if (companyError) {
        console.error('Error fetching updated company data:', companyError);
      } else if (updatedCompany && updatedCompany.perplexity_response) {
        // Update the research with the fresh data from database
        console.log('Updated research data from database:', updatedCompany.perplexity_response);
        data.research = updatedCompany.perplexity_response;
        data.requestedAt = updatedCompany.perplexity_requested_at;
        
        toast.success("Research complete", {
          id: "research-success",
          description: "Latest market research has been loaded successfully",
        });
      }
      
      return data;
    } catch (innerError) {
      // Clear the timeout to prevent potential memory leaks
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (innerError.name === 'AbortError') {
        console.error('Research timed out after', timeoutMs / 1000, 'seconds');
        
        // If we have existing data, return it instead of failing but don't show an error toast
        if (existingData?.perplexity_response) {
          console.log('Falling back to existing research data due to timeout');
          return {
            research: existingData.perplexity_response,
            requestedAt: existingData.perplexity_requested_at
          };
        }
        
        // Only throw the error, don't show toast (toast will be shown in the component)
        throw new Error('Research timed out. Please try again later.');
      }
      
      // Re-throw other errors
      throw innerError;
    }
  } catch (error) {
    console.error('Error getting latest research:', error);
    
    // Get the existing data as a last resort fallback
    try {
      const { data: lastResortData } = await supabase
        .from('companies')
        .select('perplexity_response, perplexity_requested_at')
        .eq('id', companyId)
        .maybeSingle();
        
      if (lastResortData?.perplexity_response) {
        console.log('Using last resort fallback to existing research data');
        // Don't show error toast since we have existing data to display
        return {
          research: lastResortData.perplexity_response,
          requestedAt: lastResortData.perplexity_requested_at
        };
      }
    } catch (fallbackError) {
      console.error('Error in last resort fallback:', fallbackError);
    }
    
    // Throw the error without showing toast (toast will be shown in the component)
    throw error;
  }
}
