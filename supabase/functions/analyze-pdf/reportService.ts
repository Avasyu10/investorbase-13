
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
  
  let pdfData = null;
  let lastError = null;
  
  // Strategy 1: Try direct path if it contains forward slash
  if (report.pdf_url.includes('/')) {
    try {
      console.log("Trying direct path access:", report.pdf_url);
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(report.pdf_url);
        
      if (error) {
        console.log("Direct path failed:", error.message);
        lastError = error;
      } else if (data) {
        pdfData = data;
        console.log("Successfully downloaded with direct path");
      }
    } catch (err) {
      console.log("Error with direct path:", err);
      lastError = err;
    }
  }
  
  // Strategy 2: Try with user_id prefix for authenticated uploads
  if (!pdfData && report.user_id) {
    try {
      const userPath = `${report.user_id}/${report.pdf_url}`;
      console.log("Trying user path:", userPath);
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(userPath);
        
      if (error) {
        console.log("User path failed:", error.message);
        lastError = error;
      } else if (data) {
        pdfData = data;
        console.log("Successfully downloaded with user path");
      }
    } catch (err) {
      console.log("Error with user path:", err);
      lastError = err;
    }
  }
  
  // Strategy 3: Try public-uploads prefix for public submissions
  if (!pdfData) {
    try {
      const publicPath = `public-uploads/${report.pdf_url}`;
      console.log("Trying public path:", publicPath);
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(publicPath);
        
      if (error) {
        console.log("Public path failed:", error.message);
        lastError = error;
      } else if (data) {
        pdfData = data;
        console.log("Successfully downloaded with public path");
      }
    } catch (err) {
      console.log("Error with public path:", err);
      lastError = err;
    }
  }
  
  // Strategy 4: Check email submissions table for attachment URL
  if (!pdfData) {
    console.log("Checking email submissions table");
    const { data: emailSubmission } = await supabase
      .from('email_submissions')
      .select('attachment_url')
      .eq('report_id', reportId)
      .maybeSingle();
    
    if (emailSubmission?.attachment_url) {
      console.log("Found email attachment URL:", emailSubmission.attachment_url);
      try {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .download(emailSubmission.attachment_url);
          
        if (error) {
          console.log("Email attachment download failed:", error.message);
          lastError = error;
        } else if (data) {
          pdfData = data;
          console.log("Successfully downloaded from email attachments");
        }
      } catch (err) {
        console.log("Error downloading email attachment:", err);
        lastError = err;
      }
    }
  }
  
  // Strategy 5: Check email pitch submissions table
  if (!pdfData) {
    console.log("Checking email pitch submissions table");
    const { data: pitchSubmission } = await supabase
      .from('email_pitch_submissions')
      .select('attachment_url')
      .eq('report_id', reportId)
      .maybeSingle();
    
    if (pitchSubmission?.attachment_url) {
      console.log("Found pitch attachment URL:", pitchSubmission.attachment_url);
      try {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .download(pitchSubmission.attachment_url);
          
        if (error) {
          console.log("Pitch attachment download failed:", error.message);
          lastError = error;
        } else if (data) {
          pdfData = data;
          console.log("Successfully downloaded from pitch attachments");
        }
      } catch (err) {
        console.log("Error downloading pitch attachment:", err);
        lastError = err;
      }
    }
  }
  
  // Strategy 6: Try simple filename in report_pdfs
  if (!pdfData) {
    const filename = report.pdf_url.split('/').pop() || report.pdf_url;
    try {
      console.log("Trying simple filename:", filename);
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(filename);
        
      if (error) {
        console.log("Simple filename failed:", error.message);
        lastError = error;
      } else if (data) {
        pdfData = data;
        console.log("Successfully downloaded with simple filename");
      }
    } catch (err) {
      console.log("Error with simple filename:", err);
      lastError = err;
    }
  }
  
  if (!pdfData) {
    const errorMessage = lastError ? (typeof lastError === 'object' ? JSON.stringify(lastError) : lastError.toString()) : "No PDF data found in any storage location";
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
