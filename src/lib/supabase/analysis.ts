import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob } from '@/lib/pdf-parser';
import { toast } from "@/hooks/use-toast";

export async function analyzeReport(reportId: string) {
  try {
    console.log('Calling analyze function with report ID:', reportId);
    
    // First check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      toast({
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
        title: "Invalid Report ID",
        description: "The report ID format is invalid. Please try again with a valid report.",
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    // First, check if this is a public submission or email submission
    console.log('Checking report type...');
    const { data: report } = await supabase
      .from('reports')
      .select('is_public_submission')
      .eq('id', reportId)
      .maybeSingle();
      
    const isPublicSubmission = report?.is_public_submission || false;
    console.log(`Report is${isPublicSubmission ? '' : ' not'} a public submission`);
    
    // Determine which function to call based on whether it's a public submission or not
    const functionName = isPublicSubmission ? 'analyze-public-pdf' : 'analyze-pdf';
    console.log(`Will use ${functionName} function for analysis`);
    
    try {
      // Call the edge function with proper error handling and retries
      console.log(`Invoking ${functionName} function with report ID: ${reportId}`);
      
      // Implement retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount} for ${functionName} function`);
            // Add a short delay between retries that increases with each attempt
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
          
          // Check if we're in a development environment
          const isDevelopment = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
          
          // Log the current environment
          console.log(`Current environment: ${isDevelopment ? 'Development' : 'Production'}`);
          console.log(`Base URL: ${window.location.origin}`);
          
          // Call the edge function with direct URL to avoid potential path issues
          const functionUrl = `https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/${functionName}`;
          
          // First get the auth token for authorization
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('Authentication session not found');
          }
          
          // Get the API key from the environment
          // Use the public anon key from our Supabase project
          const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY";
          
          // Make a direct fetch request to the function URL
          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ reportId })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge function error: ${response.status} - ${errorText}`);
          }
          
          const data = await response.json();
          
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
              title: "Analysis failed",
              description: userMessage,
              variant: "destructive"
            });
            
            throw new Error(errorMessage);
          }
          
          console.log('Analysis result:', data);
          
          // If analysis was successful, extract company details as well
          if (data.companyId) {
            try {
              console.log('Extracting company details...');
              
              const detailsResponse = await fetch(`https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/details-in-analyze-pdf`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': SUPABASE_KEY
                },
                body: JSON.stringify({ 
                  reportId,
                  companyId: data.companyId
                })
              });
              
              if (!detailsResponse.ok) {
                console.error(`Company details extraction failed: ${detailsResponse.status}`);
                console.error(await detailsResponse.text());
              } else {
                const detailsData = await detailsResponse.json();
                console.log('Company details extraction result:', detailsData);
              }
            } catch (detailsError) {
              // We don't want to fail the whole process if details extraction fails
              console.error('Error extracting company details:', detailsError);
            }
          }
          
          toast({
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
      throw lastError || new Error(`Failed to invoke ${functionName} function after multiple attempts`);
      
    } catch (innerError) {
      // Check if this is a CORS error
      if (innerError.message?.includes('CORS') || innerError.name === 'TypeError') {
        console.error('Possible CORS or network configuration issue:', innerError);
        toast({
          title: "Connection Error",
          description: "Could not connect to the analysis service due to a network configuration issue. This may be because the Edge Function is not properly deployed or configured.",
          variant: "destructive"
        });
        throw new Error('Network configuration error. Please make sure your Edge Functions are properly deployed.');
      }
      
      // Handle timeout specifically
      if (innerError.name === 'AbortError' || innerError.message?.includes('timeout')) {
        console.error('Analysis timed out after extended period');
        toast({
          title: "Analysis timed out",
          description: "The analysis is taking longer than expected. Please try again with a smaller file or try later.",
          variant: "destructive"
        });
        throw new Error('Analysis timed out. Please try with a smaller file or try again later.');
      }
      
      // Add specific handling for Supabase function errors
      if (innerError.message?.includes('FunctionsFetchError') || 
          innerError.message?.includes('functions-fetch')) {
        console.error('Supabase Function fetch error:', innerError);
        toast({
          title: "Edge Function Error",
          description: "Could not connect to the Supabase Edge Function. Please verify that your Edge Functions are properly deployed.",
          variant: "destructive"
        });
        throw new Error('Edge Function connection error. Please verify your Edge Functions deployment.');
      }
      
      // Handle network errors more specifically
      if (innerError.message?.includes('Failed to fetch') || 
          innerError.message?.includes('Failed to send') ||
          innerError.message?.includes('network') ||
          innerError.message?.includes('Connection')) {
        
        console.error('Network error when calling analyze-pdf function:', innerError);
        toast({
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
        title: "Analysis failed",
        description: "Could not analyze the report. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}

export async function autoAnalyzePublicReport(reportId: string) {
  try {
    console.log('Checking if report should be auto-analyzed:', reportId);
    
    // First check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Add validation for reportId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!reportId || !uuidRegex.test(reportId)) {
      const errorMessage = `Invalid report ID format: ${reportId}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      // Call the edge function with proper error handling
      console.log(`Invoking auto-analyze-public-pdf function with report ID: ${reportId}`);
      
      const { data, error } = await supabase.functions.invoke('auto-analyze-public-pdf', {
        body: { reportId }
      });
      
      if (error) {
        console.error('Error invoking auto-analyze-public-pdf function:', error);
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during auto-analysis check";
        console.error('API returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('Auto-analyze result:', data);
      
      // If auto-analyze was triggered, show a toast notification
      if (data.autoAnalyze) {
        toast({
          title: "Auto-analysis initiated",
          description: "The pitch deck is being analyzed automatically",
        });
      }
      
      return data;
    } catch (innerError) {
      console.error('Error in auto-analyze check:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error in autoAnalyzePublicReport:', error);
    throw error;
  }
}

export async function autoAnalyzeEmailSubmission(submissionId: string) {
  try {
    console.log('Checking if email report should be auto-analyzed:', submissionId);
    
    // First check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Add validation for submission UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!submissionId || !uuidRegex.test(submissionId)) {
      const errorMessage = `Invalid submission ID format: ${submissionId}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    try {
      // Call the edge function with proper error handling
      console.log(`Invoking auto-analyze-email-submission function with submission ID: ${submissionId}`);
      
      // Let's verify that we're using the correct function name and add more debug info
      console.log('Edge function URL:', `https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-email-submission`);
      
      // Add a direct fetch call to verify edge function access
      try {
        // Get the auth token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Authentication session not found');
        }
        
        // Get the API key from the environment
        const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY";
        
        console.log('Making direct fetch call to edge function');
        const directResponse = await fetch(`https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-email-submission`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({ submissionId })
        });
        
        if (!directResponse.ok) {
          console.error(`Direct fetch failed with status: ${directResponse.status}`);
          console.error('Response:', await directResponse.text());
        } else {
          console.log('Direct fetch succeeded:', await directResponse.json());
        }
      } catch (fetchError) {
        console.error('Error making direct fetch call:', fetchError);
      }
      
      // Now call using the Supabase client (our primary method)
      const { data, error } = await supabase.functions.invoke('auto-analyze-email-submission', {
        body: { submissionId }
      });
      
      if (error) {
        console.error('Error invoking auto-analyze-email-submission function:', error);
        throw error;
      }
      
      if (!data || data.error) {
        const errorMessage = data?.error || "Unknown error occurred during auto-analysis check";
        console.error('API returned error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('Auto-analyze email result:', data);
      
      // If auto-analyze was triggered, show a toast notification
      if (data.autoAnalyze) {
        toast({
          title: "Auto-analysis initiated",
          description: "The email pitch deck is being analyzed automatically",
        });
      }
      
      return data;
    } catch (innerError) {
      console.error('Error in auto-analyze check:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error in autoAnalyzeEmailSubmission:', error);
    // Don't throw to avoid blocking UI
    return { success: false, autoAnalyze: false };
  }
}
