
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
    descriptionLength: report.description?.length || 0
  });
  
  // Get the PDF file from storage
  if (!report.pdf_url) {
    throw new Error("No PDF URL found in report");
  }
  
  console.log("Downloading PDF from storage:", report.pdf_url);
  
  const { data: pdfData, error: downloadError } = await supabase.storage
    .from('report_pdfs')
    .download(report.pdf_url);
    
  if (downloadError) {
    console.error("PDF download error:", downloadError);
    throw new Error(`Failed to download PDF: ${downloadError.message}`);
  }
  
  if (!pdfData) {
    throw new Error("No PDF data received");
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
