
import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob, ParsedPdfSegment } from '../pdf-parser';
import { toast } from "@/hooks/use-toast";

// Types for our database
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  parsedSegments?: ParsedPdfSegment[];
  pdf_content?: string;
};

// Functions to interact with Supabase

export async function getReports() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user found');
    return [];
  }

  // Get reports from the reports table for the current user
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    throw tableError;
  }

  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData);
    return tableData as Report[];
  }

  console.log('No reports found for this user');
  return [];
}

export async function getReportById(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the report from the reports table
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
    throw tableError;
  }

  if (!tableData) {
    throw new Error('Report not found');
  }

  const report = tableData as Report;

  // If we have direct PDF content in the database
  if (report.pdf_content) {
    try {
      // Convert base64 to blob
      const binaryString = atob(report.pdf_content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      
      // Parse the PDF content
      const parsedSegments = await parsePdfFromBlob(pdfBlob);
      
      // Add parsed segments to the report
      report.parsedSegments = parsedSegments;
      
      return report;
    } catch (error) {
      console.error('Error parsing PDF content:', error);
      // Return the report without parsed segments if parsing fails
      return report;
    }
  } else if (report.pdf_url) {
    try {
      // Download the file
      const pdfBlob = await downloadReport(report.pdf_url, user.id);
      
      // Parse the PDF content
      const parsedSegments = await parsePdfFromBlob(pdfBlob);
      
      // Add parsed segments to the report
      report.parsedSegments = parsedSegments;
      
      return report;
    } catch (error) {
      console.error('Error parsing PDF content:', error);
      // Return the report without parsed segments if parsing fails
      return report;
    }
  }

  return report;
}

export async function downloadReport(fileUrl: string, userId: string) {
  const { data, error } = await supabase.storage
    .from('report_pdfs')
    .download(`${userId}/${fileUrl}`);

  if (error) {
    console.error('Error downloading report:', error);
    throw error;
  }

  return data;
}

export async function analyzeReportDirect(file: File, title: string, description: string) {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    console.log('Converting file to base64...');
    
    // Convert file to base64
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract just the base64 data part
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    
    console.log('File converted to base64, calling analyze-pdf-direct function');
    
    // Call the edge function using the Supabase client
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64: base64String 
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      let errorMessage = "There was a problem analyzing the report";
      
      // Check if we have a more specific error message
      if (error.message?.includes('non-2xx status code')) {
        errorMessage = "The analysis function returned an error. Please try again later.";
      }
      
      // Use a unique toast ID to prevent duplicate toasts
      toast({
        id: "analysis-error-direct-1",
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      // Use a unique toast ID to prevent duplicate toasts
      toast({
        id: "analysis-error-direct-2",
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    toast({
      id: "analysis-success-direct",
      title: "Analysis complete",
      description: "Your pitch deck has been successfully analyzed",
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing report directly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Prevent duplicate toasts
    if (!errorMessage.includes("analysis failed")) {
      toast({
        id: "analysis-error-direct-3",
        title: "Analysis failed",
        description: "Could not analyze the report. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}
