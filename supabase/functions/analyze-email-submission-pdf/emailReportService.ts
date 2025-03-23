
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Function to get report data from email submissions
export async function getEmailReportData(reportId: string, authToken: string = '') {
  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase environment variables not configured');
    }
    
    // Create a Supabase service client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Create a authenticated client if auth token provided
    const authClient = authToken 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
          global: { headers: { Authorization: authToken } },
        })
      : supabase;
    
    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (reportError) {
      console.error('Error fetching report:', reportError);
      throw new Error(`Report not found: ${reportError.message}`);
    }
    
    if (!report) {
      throw new Error('Report not found');
    }

    // Find the associated email submission
    const { data: emailSubmission, error: emailError } = await supabase
      .from('email_submissions')
      .select('*')
      .eq('report_id', reportId)
      .single();
    
    if (emailError) {
      console.error('Error fetching email submission:', emailError);
      throw new Error(`Email submission not found: ${emailError.message}`);
    }
    
    if (!emailSubmission) {
      throw new Error('Email submission not found');
    }
    
    if (!emailSubmission.attachment_url) {
      throw new Error('No PDF attachment found in email submission');
    }
    
    console.log('Found email submission with attachment:', emailSubmission.attachment_url);
    
    // Get the PDF from storage
    const { data: pdfData, error: pdfError } = await supabase
      .storage
      .from('email_attachments')
      .download(emailSubmission.attachment_url);
    
    if (pdfError) {
      console.error('Error downloading PDF:', pdfError);
      throw new Error(`Error downloading PDF: ${pdfError.message}`);
    }
    
    if (!pdfData) {
      throw new Error('PDF file is empty');
    }
    
    // Convert PDF to base64
    const base64String = await blobToBase64(pdfData);
    
    console.log('Successfully converted PDF to base64');
    
    return {
      supabase: authClient,
      report,
      pdfBase64: base64String,
      emailSubmission
    };
  } catch (error) {
    console.error('Error in getEmailReportData:', error);
    throw error;
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
