
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export async function getReportData(reportId: string, authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  // Create a Supabase client with service role key (admin access)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Get the report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, submission_form_id, public_submission_forms:submission_form_id(*)')
    .eq('id', reportId)
    .single();
  
  if (reportError) {
    console.error('Error fetching report:', reportError);
    throw new Error(`Report not found: ${reportError.message}`);
  }
  
  if (!report) {
    throw new Error(`Report not found with ID: ${reportId}`);
  }
  
  console.log(`Found report: ${report.id}, title: ${report.title}`);
  
  // If the report doesn't have a PDF URL, we can't analyze it
  if (!report.pdf_url) {
    throw new Error('Report has no associated PDF file');
  }
  
  // Download the PDF file from public_uploads bucket
  const { data: pdfData, error: pdfError } = await supabase.storage
    .from('public_uploads')
    .download(report.pdf_url);
  
  if (pdfError) {
    console.error('Error downloading PDF:', pdfError);
    throw new Error(`Failed to download PDF: ${pdfError.message}`);
  }
  
  if (!pdfData) {
    throw new Error('PDF file could not be downloaded');
  }
  
  // Convert the blob to base64
  const base64 = await blobToBase64(pdfData);
  
  return { supabase, report, pdfBase64: base64 };
}

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  // Use FileReader API for the conversion, but make it work in Deno/Edge environment
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
