
import { createClient } from '@supabase/supabase-js';
import { parsePdfFromBlob, ParsedPdfSegment } from './pdf-parser';
import { toast } from "@/hooks/use-toast";

// These are provided by your Supabase project
const supabaseUrl = 'https://jhtnruktmtjqrfoiyrep.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  sections?: string[];
  parsedSegments?: ParsedPdfSegment[];
  user_id: string;
  analysis_status?: string;
  analysis_error?: string;
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
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
    throw tableError;
  }

  if (!tableData) {
    throw new Error('Report not found');
  }

  const report = tableData as Report;

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

export async function downloadReport(fileUrl: string, userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // First attempt: Try with the user ID path structure
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(`${user.id}/${fileUrl}`);

    if (error) {
      console.error('Error with user path, trying fallback:', error);
      
      // Second attempt: Try direct path (for files uploaded before RLS implementation)
      const { data: directData, error: directError } = await supabase.storage
        .from('report_pdfs')
        .download(fileUrl);
        
      if (directError) {
        console.error('All download attempts failed:', directError);
        throw directError;
      }
      
      return directData;
    }

    return data;
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
}

export async function uploadReport(file: File, title: string, description: string = '', websiteUrl?: string) {
  try {
    // Check for authenticated user
    const { data, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    
    if (!data.user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    const user = data.user;
    console.log('Uploading report for user:', user.id);
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    // Upload the file to storage with user ID in path for RLS
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded to storage successfully, saving record to database');
    
    // Insert a record in the reports table with user_id
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        pdf_url: fileName,
        user_id: user.id,
        analysis_status: 'pending'
      }])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting report record:', insertError);
      throw insertError;
    }

    console.log('Report record created successfully:', report);
    
    return report as Report;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}

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
    
    // Update report status to completed
    await supabase
      .from('reports')
      .update({
        analysis_status: 'completed',
        company_id: data.companyId
      })
      .eq('id', reportId);
    
    return data;
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}

export async function analyzeReportDirect(file: File, title: string, description: string = '') {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
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
    
    // Call the edge function including user ID
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64: base64String,
        userId: user.id
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      toast({
        id: "analysis-error-direct-1",
        title: "Analysis failed",
        description: "There was a problem analyzing the report. Please try again later.",
        variant: "destructive"
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
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
