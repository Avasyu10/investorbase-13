
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, authHeader: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`Getting report data for ${reportId}`);

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

  // First, check if the report exists at all (for better error messages)
  const { data: allReports, error: allReportsError } = await supabase
    .from('reports')
    .select('id')
    .eq('id', reportId);
    
  if (allReportsError) {
    console.error("Error checking if report exists:", allReportsError);
    throw new Error('Database error: ' + allReportsError.message);
  }
  
  if (!allReports || allReports.length === 0) {
    console.error(`Report with ID ${reportId} does not exist`);
    throw new Error('Report not found');
  }

  // Now get the specific report with user_id filter
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (reportError) {
    console.error("Report error:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }

  if (!report) {
    console.error(`Access denied: Report ${reportId} belongs to another user`);
    throw new Error('Access denied: This report belongs to another user');
  }

  console.log(`Found report: ${report.title}, downloading PDF from storage`);

  // Download the PDF from storage
  const { data: pdfData, error: pdfError } = await supabase
    .storage
    .from('report_pdfs')
    .download(`${user.id}/${report.pdf_url}`);

  if (pdfError) {
    console.error("PDF download error:", pdfError);
    throw new Error('Error downloading PDF: ' + pdfError.message);
  }

  if (!pdfData || pdfData.size === 0) {
    console.error("PDF data is empty");
    throw new Error('PDF file is empty or corrupted');
  }

  console.log("PDF downloaded successfully, converting to base64");

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
