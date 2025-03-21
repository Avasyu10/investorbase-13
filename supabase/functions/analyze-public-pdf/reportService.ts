
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export async function getReportData(reportId: string, authHeader: string): Promise<{ supabase: any, report: any, pdfBase64: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Create an anonymous Supabase client first for unauthenticated actions
  // We'll use this to fetch the public report data
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Verify the report exists and is a public submission
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, public_submission_forms(*)')
    .eq('id', reportId)
    .eq('is_public_submission', true)
    .maybeSingle();
  
  if (reportError) {
    console.error('Error fetching report:', reportError);
    throw new Error(`Error fetching report: ${reportError.message}`);
  }
  
  if (!report) {
    throw new Error('Public report not found');
  }
  
  // Make sure the report is associated with a public submission form
  if (!report.submission_form_id) {
    throw new Error('This report is not associated with a public submission form');
  }
  
  console.log(`Found public report: ${report.id}, title: ${report.title}`);
  
  // If we have an auth header, validate it to see if the user has access to more data
  let userId = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated user: ${userId}`);
      }
    } catch (authCheckError) {
      console.log('Error checking authentication, proceeding as anonymous:', authCheckError);
    }
  }
  
  // Now we use service role client to bypass RLS for storage access
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Determine the storage path - IMPORTANT: This must match how files are stored
  const storageFolder = 'public'; // For public submissions, we'll always use the 'public' folder
  
  console.log(`Attempting to download PDF from path: ${storageFolder}/${report.pdf_url}`);
  
  try {
    // Get the PDF content with improved error handling
    const { data: fileData, error: fileError } = await serviceClient.storage
      .from('report_pdfs')
      .download(`${storageFolder}/${report.pdf_url}`);
    
    if (fileError) {
      console.error('Error downloading file:', fileError);
      throw new Error(`Error downloading PDF: ${JSON.stringify(fileError)}`);
    }
    
    if (!fileData) {
      throw new Error('Downloaded file is empty or null');
    }
    
    console.log(`Successfully downloaded PDF, size: ${fileData.size} bytes`);
    
    // Convert the file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    console.log(`Successfully converted PDF to base64, length: ${base64.length}`);
    
    // Return both the original supabase client and the report data
    return { supabase, report, pdfBase64: base64 };
  } catch (error) {
    console.error('Error in PDF processing:', error);
    throw new Error(`Error downloading PDF: ${JSON.stringify(error)}`);
  }
}
