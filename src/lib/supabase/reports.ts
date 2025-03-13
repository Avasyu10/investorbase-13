import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob, type ParsedPdfSegment } from "../pdf-parser";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { analyzeReport } from "./analysis";

// Define the Report type to match what's being used
type Report = Tables["reports"] & {
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
  console.log(`Downloading report: ${fileUrl} for user: ${userId}`);
  
  // Attempt to download with user ID path
  const { data, error } = await supabase.storage
    .from('report_pdfs')
    .download(`${userId}/${fileUrl}`);

  if (error) {
    console.error('Error downloading report with user ID prefix:', error);
    
    // Try without user ID prefix as fallback
    console.log('Trying to download without user ID prefix');
    const { data: altData, error: altError } = await supabase.storage
      .from('report_pdfs')
      .download(fileUrl);
      
    if (altError) {
      console.error('Error downloading report without user ID prefix:', altError);
      throw error; // Throw the original error if both approaches fail
    }
    
    return altData;
  }

  return data;
}

export async function uploadReport(file: File, title: string, description: string) {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log('Uploading report for user:', user.id);
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // Important: Store filepath with user ID prefix
    const filePath = `${user.id}/${fileName}`;
    console.log('File will be stored at path:', filePath);
    
    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded to storage successfully, saving record to database');
    
    // Insert a record in the reports table
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        pdf_url: fileName, // Store just the filename part in the database
        user_id: user.id
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
