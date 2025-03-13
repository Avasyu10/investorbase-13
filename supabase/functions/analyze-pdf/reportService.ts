
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

  // Validate reportId format - check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

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

  // Get the specific report with user ID filter
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('id, title, user_id, pdf_url')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }
  
  if (!reportData) {
    console.error(`Report with ID ${reportId} not found for user ${user.id}`);
    
    // Check if report exists but belongs to different user
    const { data: anyReport } = await supabase
      .from('reports')
      .select('id, user_id')
      .eq('id', reportId)
      .maybeSingle();
      
    if (anyReport) {
      console.error(`Report exists but belongs to user ${anyReport.user_id}, not ${user.id}`);
      throw new Error(`Access denied: Report ${reportId} belongs to another user`);
    } else {
      console.error(`Report with ID ${reportId} truly does not exist in the database`);
      throw new Error(`Report with ID ${reportId} not found`);
    }
  }

  const report = reportData;
  
  if (!report.pdf_url) {
    console.error(`Report ${reportId} does not have a PDF URL`);
    throw new Error(`Report is missing PDF file reference`);
  }
  
  console.log(`Found user's report: ${report.title}, accessing PDF from storage`);

  // The storage path should include the user ID
  const storagePath = `${user.id}/${report.pdf_url}`;
  console.log(`Attempting to download PDF from path: ${storagePath}`);

  // List files in user's folder to debug
  const { data: bucketFiles } = await supabase
    .storage
    .from('report_pdfs')
    .list(user.id, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });
    
  if (bucketFiles) {
    console.log(`Found ${bucketFiles.length} files in user's storage folder`);
    if (bucketFiles.length > 0) {
      console.log("Available files:", bucketFiles.map(f => f.name).join(", "));
    }
  }

  // Download the PDF from storage
  const { data: pdfData, error: pdfError } = await supabase
    .storage
    .from('report_pdfs')
    .download(storagePath);

  if (pdfError) {
    console.error("PDF download error:", pdfError);
    console.error(`Failed to access PDF at path: ${storagePath}`);
    
    // Try alternative paths as fallback (for backward compatibility)
    console.log("Attempting alternative storage paths...");
    
    // Try without user ID prefix
    const altPath = report.pdf_url;
    console.log(`Trying alternative path: ${altPath}`);
    const { data: altPdfData, error: altPdfError } = await supabase
      .storage
      .from('report_pdfs')
      .download(altPath);
      
    if (altPdfError) {
      console.error("Alternative path failed:", altPdfError);
      throw new Error('Error downloading PDF: ' + pdfError.message);
    }
    
    if (altPdfData) {
      console.log(`Successfully downloaded PDF from alternative path: ${altPath}`);
      
      // Use the successfully downloaded data
      const pdfBase64 = await altPdfData.arrayBuffer()
        .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));
        
      if (!pdfBase64 || pdfBase64.length === 0) {
        console.error("PDF base64 conversion failed");
        throw new Error('Failed to convert PDF to base64');
      }
      
      console.log(`PDF base64 conversion successful, length: ${pdfBase64.length}`);
      return { supabase, report, user, pdfBase64 };
    }
    
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
