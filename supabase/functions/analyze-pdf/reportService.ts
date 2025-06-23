
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
  const bucketName = 'report_pdfs';
  
  // Try multiple path combinations to find the file
  const pathsToTry = [
    report.pdf_url, // Direct filename
    `${report.user_id}/${report.pdf_url}`, // User-specific path
  ];
  
  console.log(`Trying to download from bucket: ${bucketName}`);
  console.log(`Paths to try: ${pathsToTry.join(', ')}`);
  
  for (const filePath of pathsToTry) {
    try {
      console.log(`Attempting to download: ${filePath}`);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);
        
      if (!error && data && data.size > 0) {
        pdfData = data;
        console.log(`Successfully downloaded PDF from path: ${filePath}, size: ${data.size}`);
        break;
      } else if (error) {
        console.log(`Download failed for path ${filePath}: ${error.message}`);
      } else {
        console.log(`No data or empty file for path: ${filePath}`);
      }
    } catch (err) {
      console.log(`Exception downloading ${filePath}:`, err);
    }
  }
  
  if (!pdfData) {
    throw new Error(`Failed to download PDF from storage. Tried paths: ${pathsToTry.join(', ')}`);
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
