
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

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  
  if (userError || !user) {
    console.error("Auth error:", userError);
    throw new Error('Unauthorized');
  }

  // Get report details from database
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (reportError || !report) {
    console.error("Report error:", reportError);
    throw new Error('Report not found or access denied');
  }

  console.log(`Found report: ${report.title}, downloading PDF from storage`);

  // Download the PDF from storage
  const { data: pdfData, error: pdfError } = await supabase
    .storage
    .from('report_pdfs')
    .download(`${user.id}/${report.pdf_url}`);

  if (pdfError || !pdfData) {
    console.error("PDF download error:", pdfError);
    throw new Error('Error downloading PDF');
  }

  console.log("PDF downloaded successfully, converting to base64");

  // Convert PDF to base64
  const pdfBase64 = await pdfData.arrayBuffer()
    .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));

  return { supabase, report, user, pdfBase64 };
}
