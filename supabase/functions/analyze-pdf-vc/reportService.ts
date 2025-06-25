
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export async function getReportData(reportId: string) {
  console.log("Getting report data for:", reportId);
  
  // Create a Supabase client without authentication
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // First, let's check if the report exists at all
  const { data: reportCheck, error: checkError } = await supabase
    .from('reports')
    .select('id, title, user_id, pdf_url')
    .eq('id', reportId);
  
  console.log("Report check result:", reportCheck, "Error:", checkError);
  
  if (checkError) {
    console.error("Error checking report:", checkError);
    throw new Error(`Failed to check report: ${checkError.message}`);
  }
  
  if (!reportCheck || reportCheck.length === 0) {
    console.error("No report found with ID:", reportId);
    throw new Error(`Report not found with ID: ${reportId}`);
  }
  
  if (reportCheck.length > 1) {
    console.error("Multiple reports found with same ID:", reportId);
    throw new Error(`Multiple reports found with ID: ${reportId}`);
  }
  
  const report = reportCheck[0];
  console.log("Report found:", report.title, "User:", report.user_id);
  
  // Download the PDF from storage using the report's pdf_url
  let pdfBase64: string;
  
  try {
    // Build the file path based on user_id and pdf_url
    const filePath = report.user_id ? `${report.user_id}/${report.pdf_url}` : report.pdf_url;
    
    console.log("Downloading PDF from storage:", filePath);
    
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('report_pdfs')
      .download(filePath);
    
    if (downloadError) {
      console.error("Error downloading PDF:", downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    if (!pdfData) {
      throw new Error("PDF data is null");
    }
    
    // Convert blob to base64
    const arrayBuffer = await pdfData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    pdfBase64 = btoa(binaryString);
    
    console.log("PDF converted to base64, length:", pdfBase64.length);
    
    if (pdfBase64.length === 0) {
      throw new Error("PDF conversion resulted in empty base64 string");
    }
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    supabase,
    report,
    pdfBase64
  };
}
