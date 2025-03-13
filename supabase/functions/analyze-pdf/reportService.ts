
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, authHeader: string = '') {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`Getting report data for reportId: ${reportId}`);

  // Validate reportId format - check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

  // Get the specific report without user ID filter
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('id, title, user_id, pdf_url')
    .eq('id', reportId)
    .maybeSingle();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }
  
  if (!reportData) {
    console.error(`Report with ID ${reportId} not found`);
    throw new Error(`Report with ID ${reportId} not found`);
  }

  const report = reportData;
  
  if (!report.pdf_url) {
    console.error(`Report ${reportId} does not have a PDF URL`);
    throw new Error(`Report is missing PDF file reference`);
  }
  
  console.log(`Found report: ${report.title}, accessing PDF from storage`);

  // Try different storage paths to accommodate both formats
  let pdfData;
  let pdfError;

  // First try: Direct path
  console.log(`Attempting to download PDF from path: ${report.pdf_url}`);
  const directResult = await supabase
    .storage
    .from('report_pdfs')
    .download(report.pdf_url);

  if (!directResult.error) {
    pdfData = directResult.data;
  } else {
    pdfError = directResult.error;
    console.log("Direct path failed, trying alternative paths...");
    
    // Second try: With user_id if present
    if (report.user_id) {
      const userPath = `${report.user_id}/${report.pdf_url}`;
      console.log(`Trying path with user_id: ${userPath}`);
      
      const userResult = await supabase
        .storage
        .from('report_pdfs')
        .download(userPath);
        
      if (!userResult.error) {
        pdfData = userResult.data;
        pdfError = null;
      }
    }
  }

  if (pdfError && !pdfData) {
    console.error("All PDF download attempts failed:", pdfError);
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

  return { supabase, report, pdfBase64 };
}
