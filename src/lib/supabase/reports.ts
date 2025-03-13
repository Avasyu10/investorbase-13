
import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob, type ParsedPdfSegment } from "../pdf-parser";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

// Define the Report type to match what's being used
type Report = Tables<"reports"> & {
  parsedSegments?: ParsedPdfSegment[];
};

export async function getReports() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user found');
    return [];
  }

  // Get reports from the reports table for the current user
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies(name, overall_score)')
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
    .select('*, companies(*)')
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

  return tableData as Report;
}

export async function downloadReport(fileUrl: string, userId: string) {
  console.log(`Downloading report from path: ${userId}/${fileUrl}`);
  
  // The correct path includes the user ID folder
  const { data, error } = await supabase.storage
    .from('report_pdfs')
    .download(`${userId}/${fileUrl}`);

  if (error) {
    console.error('Error downloading report:', error);
    throw error;
  }

  console.log('Download successful');
  return data;
}

export async function uploadReport(file: File, title: string, description: string) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log('Uploading and analyzing report for user:', user.id);
    
    // Convert file to base64 for direct analysis
    const reader = new FileReader();
    
    // Create a promise to handle the FileReader async operation
    const pdfBase64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const base64 = reader.result as string;
        // Get the base64 content without the data URL prefix
        const base64Content = base64.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = () => reject(new Error('Failed to read the file'));
      reader.readAsDataURL(file);
    });
    
    const pdfBase64 = await pdfBase64Promise;
    
    // Call the analyze-pdf-direct edge function with the base64 content
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    console.log('Calling analyze-pdf-direct function');
    
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      toast({
        id: "analysis-error-1",
        title: "Analysis failed",
        description: "There was a problem analyzing the pitch deck. Please try again later.",
        variant: "destructive"
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      toast({
        id: "analysis-error-2",
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
    
    // Get the report details using the company ID
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', data.companyId)
      .maybeSingle();
      
    if (reportError) {
      console.error('Error fetching report record:', reportError);
      throw reportError;
    }

    return reportData as Report;
  } catch (error) {
    console.error('Error uploading and analyzing report:', error);
    throw error;
  }
}
