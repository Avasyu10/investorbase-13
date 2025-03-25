
import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob } from '@/lib/pdf-parser';
import { toast } from "@/hooks/use-toast";

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
    
    // Update report status to completed if not already done in the edge function
    if (!data.companyId) {
      console.error('No company ID returned from analysis');
      throw new Error('Analysis failed to return a company ID');
    }
    
    return data;
  } catch (error) {
    console.error('Error analyzing report:', error);
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
