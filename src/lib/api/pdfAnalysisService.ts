
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Function to convert file to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

// Function to analyze PDF directly with OpenAI
export const analyzePdfDirect = async (file: File, companyName: string) => {
  try {
    // Show a toast to indicate the process has started
    toast({
      id: "analysis-start",
      title: "Processing your pitch deck",
      description: "This may take a few minutes. Please wait...",
    });

    // Convert the file to base64
    const pdfBase64 = await fileToBase64(file);
    
    console.log("Sending PDF for analysis, base64 length:", pdfBase64.length);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        pdfBase64,
        companyName
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      toast({
        id: "analysis-error",
        title: "Analysis failed",
        description: `${error.message || "There was a problem analyzing the pitch deck"}`,
        variant: "destructive"
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      toast({
        id: "analysis-error-data",
        title: "Analysis failed",
        description: errorMessage,
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
    
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    
    // Make sure we're not duplicating toasts
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (!errorMessage.includes("analysis failed")) {
      toast({
        id: "analysis-error-catch",
        title: "Analysis failed",
        description: "Could not analyze the pitch deck. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
};
