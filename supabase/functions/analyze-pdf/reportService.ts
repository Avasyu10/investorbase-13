
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';

export async function getReportData(reportId: string) {
  console.log(`Getting report data for ID: ${reportId}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  // Create supabase client with service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Get the report data
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();
    
  if (reportError) {
    console.error("Report fetch error:", reportError);
    throw new Error(`Report not found: ${reportError.message}`);
  }
  
  if (!report) {
    throw new Error("Report not found");
  }
  
  console.log("Report found:", {
    id: report.id,
    title: report.title,
    pdfUrl: report.pdf_url,
    hasDescription: !!report.description,
    descriptionLength: report.description?.length || 0,
    isPublicSubmission: report.is_public_submission,
    userId: report.user_id
  });
  
  // Get the PDF file from storage
  if (!report.pdf_url) {
    throw new Error("No PDF URL found in report");
  }
  
  console.log("Attempting to download PDF from storage");
  
  let pdfData = null;
  let lastError = null;
  
  // Try to download the PDF using the most direct approach first
  try {
    console.log(`Downloading PDF from report_pdfs bucket: ${report.pdf_url}`);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(report.pdf_url);
      
    if (error) {
      console.log(`Direct download failed:`, error.message);
      lastError = error;
    } else if (data) {
      pdfData = data;
      console.log(`Successfully downloaded PDF via direct path`);
    }
  } catch (err) {
    console.log(`Error with direct download:`, err);
    lastError = err;
  }
  
  // If direct download failed and we have a user_id, try user-specific path
  if (!pdfData && report.user_id && !report.is_public_submission) {
    try {
      const userSpecificPath = `${report.user_id}/${report.pdf_url}`;
      console.log(`Trying user-specific path: ${userSpecificPath}`);
      
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(userSpecificPath);
        
      if (!error && data) {
        pdfData = data;
        console.log(`Successfully downloaded via user-specific path`);
      } else {
        console.log(`User-specific path failed:`, error?.message || 'No data');
        lastError = error;
      }
    } catch (err) {
      console.log(`User-specific path exception:`, err);
      lastError = err;
    }
  }
  
  if (!pdfData) {
    const errorMessage = lastError ? 
      (typeof lastError === 'object' ? JSON.stringify(lastError) : lastError.toString()) : 
      "No PDF data found in any storage location";
    console.error("All PDF download strategies failed. Last error:", errorMessage);
    throw new Error(`Failed to download PDF: ${errorMessage}`);
  }
  
  console.log("PDF downloaded successfully, size:", pdfData.size);
  
  // Convert to base64 using a more reliable method
  try {
    const arrayBuffer = await pdfData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use the built-in btoa function with proper string conversion
    let binaryString = '';
    const chunkSize = 8192;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const pdfBase64 = btoa(binaryString);
    
    console.log("PDF converted to base64, length:", pdfBase64.length);
    
    // Verify the base64 is valid by attempting to decode a small portion
    try {
      const testDecode = atob(pdfBase64.substring(0, 100));
      console.log("Base64 validation successful");
    } catch (validateError) {
      console.error("Base64 validation failed:", validateError);
      throw new Error("Invalid base64 encoding generated");
    }
    
    return {
      supabase,
      report,
      pdfBase64
    };
  } catch (encodingError) {
    console.error("Error encoding PDF to base64:", encodingError);
    throw new Error(`Failed to encode PDF: ${encodingError.message}`);
  }
}
