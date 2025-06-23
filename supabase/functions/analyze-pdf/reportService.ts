
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
  
  // Use service role to download - try direct path first
  try {
    console.log(`Downloading PDF: ${report.pdf_url}`);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(report.pdf_url);
      
    if (!error && data) {
      pdfData = data;
      console.log(`Successfully downloaded PDF, size: ${data.size}`);
    } else if (error) {
      console.log(`Direct download failed: ${error.message}`);
      
      // Try with user-specific path if we have a user_id
      if (report.user_id && !report.is_public_submission) {
        const userSpecificPath = `${report.user_id}/${report.pdf_url}`;
        console.log(`Trying user-specific path: ${userSpecificPath}`);
        
        const { data: userData, error: userError } = await supabase.storage
          .from('report_pdfs')
          .download(userSpecificPath);
          
        if (!userError && userData) {
          pdfData = userData;
          console.log(`Successfully downloaded via user-specific path, size: ${userData.size}`);
        } else {
          console.log(`User-specific path failed: ${userError?.message || 'No data'}`);
        }
      }
    }
  } catch (err) {
    console.log(`PDF download exception:`, err);
  }
  
  if (!pdfData) {
    throw new Error(`Failed to download PDF from storage. Path: ${report.pdf_url}`);
  }
  
  console.log("PDF downloaded successfully, size:", pdfData.size);
  
  // Convert to base64
  try {
    const arrayBuffer = await pdfData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use chunked conversion for better memory handling
    let binaryString = '';
    const chunkSize = 8192;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const pdfBase64 = btoa(binaryString);
    console.log("PDF converted to base64, length:", pdfBase64.length);
    
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
