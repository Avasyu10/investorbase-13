
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getEmailReportData(reportId: string) {
  // Get Supabase environment variables
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  // Create a service client for direct database access
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
  );
  
  // Get the report data
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, email_submissions(*)')
    .eq('id', reportId)
    .single();
  
  if (reportError || !report) {
    console.error("Error fetching report:", reportError);
    throw new Error(`Report not found for id ${reportId}`);
  }
  
  if (!report.email_submissions || report.email_submissions.length === 0) {
    throw new Error(`No email submission found for report ${reportId}`);
  }
  
  const emailSubmission = Array.isArray(report.email_submissions) 
    ? report.email_submissions[0] 
    : report.email_submissions;
  
  if (!emailSubmission.attachment_url) {
    throw new Error('Email submission has no attachment URL');
  }
  
  // Extract the file path from the URL
  const attachmentPath = emailSubmission.attachment_url.replace(/^.*\/storage\/v1\/object\/public\//, '');
  
  if (!attachmentPath) {
    throw new Error('Could not parse attachment path from URL');
  }
  
  // Now download the PDF file from storage
  console.log(`Downloading PDF from path: ${attachmentPath}`);
  
  const { data: fileData, error: fileError } = await supabase
    .storage
    .from(attachmentPath.split('/')[0])  // Bucket name is the first part of the path
    .download(attachmentPath.split('/').slice(1).join('/')); // The rest of the path
  
  if (fileError || !fileData) {
    console.error("Error downloading PDF file:", fileError);
    throw new Error(`Could not download PDF file: ${fileError?.message || 'Unknown error'}`);
  }
  
  // Convert the file to base64 for processing
  const fileReader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        // Remove the data URL prefix if present
        const base64String = fileReader.result.replace(/^data:[^;]+;base64,/, '');
        resolve(base64String);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    fileReader.onerror = () => reject(fileReader.error);
  });
  
  fileReader.readAsDataURL(fileData);
  const pdfBase64 = await base64Promise;
  
  // Update the report status to indicate processing
  try {
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        analysis_status: 'processing',
        analysis_error: null // Clear any previous errors
      })
      .eq('id', reportId);
    
    if (updateError) {
      console.warn("Could not update report status to processing:", updateError);
    } else {
      console.log(`Updated report ${reportId} status to 'processing'`);
    }
  } catch (statusUpdateError) {
    console.warn("Error updating report status to processing:", statusUpdateError);
  }
  
  return { supabase, report, pdfBase64 };
}
