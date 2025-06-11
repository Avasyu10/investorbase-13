
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
  
  console.log("Downloading PDF from storage:", report.pdf_url);
  
  // Try different storage buckets based on the source
  let pdfData = null;
  let downloadError = null;
  
  // First try report_pdfs bucket
  try {
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(report.pdf_url);
      
    if (error) {
      console.log("Failed to download from report_pdfs bucket:", error.message);
      downloadError = error;
    } else if (data) {
      pdfData = data;
      console.log("Successfully downloaded from report_pdfs bucket");
    }
  } catch (err) {
    console.log("Error accessing report_pdfs bucket:", err);
  }
  
  // If that failed, try email_attachments bucket for email submissions
  if (!pdfData && report.is_public_submission) {
    try {
      console.log("Trying email_attachments bucket for public submission");
      const { data, error } = await supabase.storage
        .from('email_attachments')
        .download(report.pdf_url);
        
      if (error) {
        console.log("Failed to download from email_attachments bucket:", error.message);
      } else if (data) {
        pdfData = data;
        console.log("Successfully downloaded from email_attachments bucket");
      }
    } catch (err) {
      console.log("Error accessing email_attachments bucket:", err);
    }
  }
  
  // If still no data, check if this is linked to an email submission
  if (!pdfData) {
    console.log("Checking for associated email submissions");
    
    // Check email_submissions table
    const { data: emailSubmission } = await supabase
      .from('email_submissions')
      .select('attachment_url')
      .eq('report_id', reportId)
      .maybeSingle();
    
    if (emailSubmission?.attachment_url) {
      console.log("Found email submission attachment:", emailSubmission.attachment_url);
      try {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .download(emailSubmission.attachment_url);
          
        if (!error && data) {
          pdfData = data;
          console.log("Successfully downloaded from email submission attachment URL");
        }
      } catch (err) {
        console.log("Error downloading email submission attachment:", err);
      }
    }
    
    // Check email_pitch_submissions table
    if (!pdfData) {
      const { data: pitchSubmission } = await supabase
        .from('email_pitch_submissions')
        .select('attachment_url')
        .eq('report_id', reportId)
        .maybeSingle();
      
      if (pitchSubmission?.attachment_url) {
        console.log("Found pitch submission attachment:", pitchSubmission.attachment_url);
        try {
          const { data, error } = await supabase.storage
            .from('email_attachments')
            .download(pitchSubmission.attachment_url);
            
          if (!error && data) {
            pdfData = data;
            console.log("Successfully downloaded from pitch submission attachment URL");
          }
        } catch (err) {
          console.log("Error downloading pitch submission attachment:", err);
        }
      }
    }
  }
  
  if (!pdfData) {
    const errorMsg = downloadError ? downloadError.message : "No PDF data found in any storage location";
    console.error("PDF download failed:", errorMsg);
    throw new Error(`Failed to download PDF: ${errorMsg}`);
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
