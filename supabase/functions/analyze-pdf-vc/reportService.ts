
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export async function getReportData(reportId: string) {
  console.log("Getting report data for:", reportId);
  
  // Create a Supabase client without authentication
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Get the report data
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();
  
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error(`Report not found: ${reportError.message}`);
  }
  
  if (!report) {
    throw new Error("Report not found");
  }
  
  console.log("Report found:", report.title);
  
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
