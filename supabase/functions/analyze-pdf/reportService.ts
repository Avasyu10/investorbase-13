
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "./cors.ts";

export async function getReportData(reportId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Create Supabase clients
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get the report details
  const { data: report, error: reportError } = await serviceClient
    .from('reports')
    .select('*, email_submissions(attachment_url)')
    .eq('id', reportId)
    .single();
  
  if (reportError) {
    console.error('Error fetching report:', reportError);
    throw reportError;
  }
  
  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }
  
  console.log('Report details:', {
    id: report.id,
    title: report.title,
    pdf_url: report.pdf_url,
    hasEmailSubmission: !!report.email_submissions,
  });
  
  let fileData: Blob;
  
  // Handle email attachments differently
  if (report.email_submissions && report.email_submissions.attachment_url) {
    const attachmentPath = report.email_submissions.attachment_url;
    console.log(`Downloading email attachment from: ${attachmentPath}`);
    
    const { data, error } = await serviceClient.storage
      .from('email_attachments')
      .download(attachmentPath);
      
    if (error) {
      console.error('Error downloading email attachment:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Email attachment not found');
    }
    
    fileData = data;
  } else {
    // Handle regular uploads
    let storagePath = report.pdf_url;
    let userId = report.user_id;
    
    // For reports with user_id, the path includes the user ID
    if (userId && !storagePath.includes('/')) {
      storagePath = `${userId}/${storagePath}`;
    }
    
    console.log(`Downloading PDF from report_pdfs: ${storagePath}`);
    
    const { data, error } = await serviceClient.storage
      .from('report_pdfs')
      .download(storagePath);
      
    if (error) {
      console.error('Error downloading PDF:', error);
      
      // Try alternative path without user ID prefix
      console.log('Trying alternative path without user ID prefix');
      const altPath = report.pdf_url.split('/').pop() || report.pdf_url;
      
      const { data: altData, error: altError } = await serviceClient.storage
        .from('report_pdfs')
        .download(altPath);
        
      if (altError) {
        console.error('Error downloading PDF with alternative path:', altError);
        throw error; // Throw the original error
      }
      
      if (!altData) {
        throw new Error('PDF not found with alternative path');
      }
      
      fileData = altData;
    } else {
      if (!data) {
        throw new Error('PDF not found');
      }
      
      fileData = data;
    }
  }
  
  // Convert to base64
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(
    Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('')
  );
  
  console.log(`Successfully converted PDF to base64, length: ${base64.length}`);
  
  return { supabase, report, pdfBase64: base64 };
}
