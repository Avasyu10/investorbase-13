
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, authHeader: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`Getting report data for reportId: ${reportId}`);

  // Extract token from authorization header
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.error("Invalid authorization token");
    throw new Error('Invalid authorization token');
  }

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError) {
    console.error("Auth error:", userError);
    throw new Error('Authentication failed: ' + userError.message);
  }
  
  if (!user) {
    console.error("No user found with the provided token");
    throw new Error('User not authenticated');
  }

  console.log(`Authenticated as user: ${user.id}`);

  // Check if the report exists at all (for better error messages)
  const { data: allReports, error: allReportsError } = await supabase
    .from('reports')
    .select('id, title, user_id')
    .eq('id', reportId);
    
  if (allReportsError) {
    console.error("Error checking if report exists:", allReportsError);
    throw new Error('Database error: ' + allReportsError.message);
  }
  
  console.log(`Found ${allReports?.length || 0} reports matching ID ${reportId}`);
  
  if (!allReports || allReports.length === 0) {
    console.error(`Report with ID ${reportId} does not exist in the database`);
    throw new Error(`Report with ID ${reportId} not found`);
  }

  const reportBelongsToUser = allReports.some(r => r.user_id === user.id);
  if (!reportBelongsToUser) {
    console.error(`Access denied: Report ${reportId} belongs to another user`);
    throw new Error(`Access denied: Report ${reportId} belongs to another user`);
  }

  const report = allReports.find(r => r.user_id === user.id);
  console.log(`Found user's report: ${report.title}, accessing PDF from storage`);

  // Build the correct storage path
  const storagePath = `${user.id}/${report.pdf_url}`;
  console.log(`Attempting to download PDF from path: ${storagePath}`);

  // Download the PDF from storage
  const { data: pdfData, error: pdfError } = await supabase
    .storage
    .from('report_pdfs')
    .download(storagePath);

  if (pdfError) {
    console.error("PDF download error:", pdfError);
    console.error(`Failed to access PDF at path: ${storagePath}`);
    throw new Error('Error downloading PDF: ' + pdfError.message);
  }

  if (!pdfData || pdfData.size === 0) {
    console.error("PDF data is empty");
    throw new Error('PDF file is empty or corrupted');
  }

  console.log(`PDF downloaded successfully, size: ${pdfData.size} bytes, converting to base64`);

  // Convert PDF to base64
  const pdfBase64 = await pdfData.arrayBuffer()
    .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));

  if (!pdfBase64 || pdfBase64.length === 0) {
    console.error("PDF base64 conversion failed");
    throw new Error('Failed to convert PDF to base64');
  }

  console.log(`PDF base64 conversion successful, length: ${pdfBase64.length}`);

  return { supabase, report, user, pdfBase64 };
}
