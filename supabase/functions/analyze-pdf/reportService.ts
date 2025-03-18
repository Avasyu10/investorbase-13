
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, authHeader: string = '') {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // Disable session persistence to prevent the warning
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins
      },
    },
  });

  console.log(`Getting report data for reportId: ${reportId}`);

  // Validate reportId format - check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

  // Get the specific report without any filters or restrictions
  console.log(`Executing query to fetch report with ID: ${reportId}`);
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
    // Log more information to help debug the issue
    console.error(`Report with ID ${reportId} not found`);
    
    // Let's also try a generic query to see if there are any reports at all
    const { data: allReports, error: allReportsError } = await supabase
      .from('reports')
      .select('id')
      .limit(5);
      
    if (allReportsError) {
      console.error("Error checking for all reports:", allReportsError);
    } else {
      console.log(`Found ${allReports.length} reports in the database. First few IDs:`, 
        allReports.map(r => r.id).join(", "));
    }
    
    throw new Error(`Report with ID ${reportId} not found`);
  }

  const report = reportData;
  
  if (!report.pdf_url) {
    console.error(`Report ${reportId} does not have a PDF URL`);
    throw new Error(`Report is missing PDF file reference`);
  }
  
  console.log(`Found report: ${report.title}, accessing PDF from storage`);

  // Try multiple paths to access the PDF without restrictions
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
    
    // Try alternative paths without user_id restriction
    const alternativePaths = [
      // Try the filename directly
      report.pdf_url,
      // Try with user_id if present
      report.user_id ? `${report.user_id}/${report.pdf_url}` : null,
      // Try just the filename part if it contains slashes
      report.pdf_url.includes('/') ? report.pdf_url.split('/').pop() : null,
    ].filter(Boolean);
    
    for (const path of alternativePaths) {
      if (!path) continue;
      
      console.log(`Trying alternative path: ${path}`);
      const pathResult = await supabase
        .storage
        .from('report_pdfs')
        .download(path);
        
      if (!pathResult.error) {
        pdfData = pathResult.data;
        pdfError = null;
        console.log(`Successfully downloaded using path: ${path}`);
        break;
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
