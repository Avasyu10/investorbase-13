
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, userId: string | null = null, authHeader: string = '') {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false // Disable session persistence to prevent the warning
    }
  });

  console.log(`Getting report data for reportId: ${reportId}`);

  // Validate reportId format - check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

  // Get the specific report with user_id filter if provided
  let query = supabase
    .from('reports')
    .select('id, title, user_id, pdf_url')
    .eq('id', reportId);
    
  // Add user_id filter if provided (used for RLS)
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data: reportData, error: reportError } = await query.maybeSingle();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }
  
  if (!reportData) {
    // Log more information to help debug the issue
    console.error(`Report with ID ${reportId} not found${userId ? ` for user ${userId}` : ''}`);
    
    // Let's also try a generic query to see if there are any reports at all
    const { data: allReports, error: allReportsError } = await supabase
      .from('reports')
      .select('id, user_id')
      .limit(5);
      
    if (allReportsError) {
      console.error("Error checking for all reports:", allReportsError);
    } else {
      console.log(`Found ${allReports.length} reports in the database. First few IDs:`, 
        allReports.map(r => r.id).join(", "));
    }
    
    throw new Error(`Report with ID ${reportId} not found${userId ? ` for user ${userId}` : ''}`);
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

  // First try: Path with user_id (new format with RLS)
  if (report.user_id) {
    console.log(`Attempting to download PDF from path: ${report.user_id}/${report.pdf_url}`);
    const userPathResult = await supabase
      .storage
      .from('report_pdfs')
      .download(`${report.user_id}/${report.pdf_url}`);
      
    if (!userPathResult.error) {
      pdfData = userPathResult.data;
    } else {
      pdfError = userPathResult.error;
      console.log("User path failed, trying alternative paths...");
    }
  }
  
  // Second try: Direct path (old format)
  if (!pdfData) {
    console.log(`Trying direct path: ${report.pdf_url}`);
    const directResult = await supabase
      .storage
      .from('report_pdfs')
      .download(report.pdf_url);

    if (!directResult.error) {
      pdfData = directResult.data;
    } else {
      pdfError = pdfError || directResult.error;
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

  // Convert PDF to base64 using a chunked approach to avoid stack overflow
  const pdfBase64 = await arrayBufferToBase64(await pdfData.arrayBuffer());

  if (!pdfBase64 || pdfBase64.length === 0) {
    console.error("PDF base64 conversion failed");
    throw new Error('Failed to convert PDF to base64');
  }

  console.log(`PDF base64 conversion successful, length: ${pdfBase64.length}`);

  return { supabase, report, pdfBase64 };
}

// Helper function to convert ArrayBuffer to base64 in chunks to avoid stack overflow
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in smaller chunks
  let base64String = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64String += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(base64String);
}
