
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "./cors.ts";

export async function getReportData(reportId: string, authHeader: string): Promise<{ supabase: any, report: any, pdfBase64: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Create an anonymous Supabase client first for unauthenticated actions
  // We'll use this to fetch the public report data
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Verify the report exists and is a public submission
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*, public_submission_forms(*)')
    .eq('id', reportId)
    .eq('is_public_submission', true)
    .maybeSingle();
  
  if (reportError) {
    console.error('Error fetching report:', reportError);
    throw new Error(`Error fetching report: ${reportError.message}`);
  }
  
  if (!report) {
    throw new Error('Public report not found');
  }
  
  // For email submissions, we don't need to check for submission_form_id
  // Check if this is from an email submission
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: emailSubmission, error: emailError } = await serviceClient
    .from('email_submissions')
    .select('*')
    .eq('report_id', reportId)
    .maybeSingle();
  
  if (!emailError && emailSubmission) {
    console.log(`Found email submission for report: ${report.id}`);
    
    // Now we use service role client to bypass RLS for storage access
    
    // Determine storage path for email attachments
    let storageBucket = 'email_attachments';
    let storagePath = emailSubmission.attachment_url;
    
    console.log(`Will attempt to download PDF from bucket: ${storageBucket}, path: ${storagePath}`);
    
    // Download the email attachment
    const { data: fileData, error: fileError } = await serviceClient.storage
      .from(storageBucket)
      .download(storagePath);
      
    if (fileError) {
      console.error(`Error downloading from ${storageBucket}/${storagePath}:`, fileError);
      throw fileError;
    }
    
    if (!fileData || fileData.size === 0) {
      console.error(`Downloaded file from ${storageBucket}/${storagePath} is empty or null`);
      throw new Error("Downloaded file is empty");
    }
    
    console.log(`Successfully downloaded PDF from ${storageBucket}/${storagePath}, size: ${fileData.size} bytes`);
    
    // Convert the file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = await arrayBufferToBase64(arrayBuffer);
    
    console.log(`Successfully converted PDF to base64, length: ${base64.length}`);
    
    return { supabase, report, pdfBase64: base64 };
  }
  
  // If it's not an email submission, check if it has a form submission
  if (!report.submission_form_id && !emailSubmission) {
    throw new Error('This report is not associated with a public submission form or email');
  }
  
  console.log(`Found public report: ${report.id}, title: ${report.title}`);
  
  // If we have an auth header, validate it to see if the user has access to more data
  let userId = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        console.log(`Authenticated user: ${userId}`);
      }
    } catch (authCheckError) {
      console.log('Error checking authentication, proceeding as anonymous:', authCheckError);
    }
  }
  
  // Now we use service role client to bypass RLS for storage access
  
  // First, try to fetch from the 'public_form_submissions' table to get the correct PDF URL and form slug
  console.log(`Fetching public submission details for report ${reportId}`);
  const { data: submissionData, error: submissionError } = await serviceClient
    .from('public_form_submissions')
    .select('pdf_url, form_slug')
    .eq('report_id', reportId)
    .maybeSingle();
  
  if (submissionError) {
    console.error('Error fetching submission details:', submissionError);
  }
  
  // Determine the storage path and bucket based on the data we have
  let storageBucket = 'report_pdfs';
  let storagePath = '';
  let formSlug = submissionData?.form_slug || '';
  
  if (submissionData?.pdf_url) {
    // For public submissions, we prioritize the pdf_url from the public_form_submissions table
    console.log(`Using PDF URL from public_form_submissions: ${submissionData.pdf_url}`);
    storagePath = submissionData.pdf_url;
  } else if (report.pdf_url) {
    // Fallback to the report.pdf_url
    console.log(`Using PDF URL from reports table: ${report.pdf_url}`);
    storagePath = report.pdf_url;
  } else {
    throw new Error('No PDF URL found for this report');
  }
  
  console.log(`Will attempt to download PDF from bucket: ${storageBucket}, path: ${storagePath}`);
  
  // Function to try downloading from a specific bucket and path
  async function tryDownloadFromBucket(bucket: string, path: string) {
    console.log(`Attempting to download from bucket: ${bucket}, path: ${path}`);
    try {
      const { data, error } = await serviceClient.storage
        .from(bucket)
        .download(path);
        
      if (error) {
        console.error(`Error downloading from ${bucket}/${path}:`, error);
        return { data: null, error };
      }
      
      if (!data || data.size === 0) {
        console.error(`Downloaded file from ${bucket}/${path} is empty or null`);
        return { data: null, error: new Error("Downloaded file is empty") };
      }
      
      console.log(`Successfully downloaded PDF from ${bucket}/${path}, size: ${data.size} bytes`);
      return { data, error: null };
    } catch (e) {
      console.error(`Exception downloading from ${bucket}/${path}:`, e);
      return { data: null, error: e };
    }
  }
  
  // Try downloading from determined bucket and path
  let fileData = null;
  let fileError = null;
  
  // First attempt with the original path
  const primaryResult = await tryDownloadFromBucket(storageBucket, storagePath);
  
  if (primaryResult.data) {
    fileData = primaryResult.data;
  } else {
    fileError = primaryResult.error;
    
    // If the primary attempt failed, try alternative options
    console.log("Primary download failed, trying alternatives...");
    
    // Generate a list of possible paths to try
    const possiblePaths = [];
    
    // The original path
    possiblePaths.push(storagePath);
    
    // If path doesn't start with formSlug but formSlug exists, try with formSlug prefix
    if (formSlug && !storagePath.startsWith(`${formSlug}/`)) {
      const filename = storagePath.split('/').pop() || storagePath;
      possiblePaths.push(`${formSlug}/${filename}`);
    }
    
    // Try with just the filename (no directories)
    const filename = storagePath.split('/').pop();
    if (filename) {
      possiblePaths.push(filename);
    }
    
    // For old files, check if they might be under the user's directory
    if (userId && !storagePath.startsWith(`${userId}/`)) {
      possiblePaths.push(`${userId}/${storagePath}`);
      
      // Also try with just the filename
      if (filename) {
        possiblePaths.push(`${userId}/${filename}`);
      }
    }
    
    console.log("Trying alternative paths:", possiblePaths);
    
    // Try each alternative path
    for (const path of possiblePaths) {
      if (path === storagePath) continue; // Skip the original path we already tried
      
      const result = await tryDownloadFromBucket(storageBucket, path);
      if (result.data) {
        console.log(`Successfully downloaded using alternative path: ${path}`);
        fileData = result.data;
        break;
      }
    }
    
    // If still no success, try the public_uploads bucket
    if (!fileData) {
      console.log("Trying public_uploads bucket as last resort");
      
      for (const path of possiblePaths) {
        const result = await tryDownloadFromBucket('public_uploads', path);
        if (result.data) {
          console.log(`Successfully downloaded from public_uploads bucket using path: ${path}`);
          fileData = result.data;
          break;
        }
      }
    }
  }
  
  if (!fileData) {
    console.error("All PDF download attempts failed:", fileError);
    
    // Enhanced error message with debugging info
    const errorDetails = {
      reportId,
      storageBucket,
      storagePath,
      formSlug,
      possiblePaths: [
        storagePath,
        formSlug ? `${formSlug}/${storagePath.split('/').pop()}` : null,
        storagePath.split('/').pop()
      ].filter(Boolean),
      originalError: fileError
    };
    
    throw new Error(`Error downloading PDF: ${JSON.stringify(errorDetails)}`);
  }
  
  console.log(`PDF downloaded successfully, size: ${fileData.size} bytes, converting to base64`);
  
  // Convert the file to base64 using a chunked approach to avoid memory issues
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = await arrayBufferToBase64(arrayBuffer);
    
    console.log(`Successfully converted PDF to base64, length: ${base64.length}`);
    
    return { supabase, report, pdfBase64: base64 };
  } catch (error) {
    console.error('Error in base64 conversion:', error);
    throw new Error(`Error converting PDF to base64: ${error.message}`);
  }
}

// Helper function to convert ArrayBuffer to base64 in chunks to avoid memory issues
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in smaller chunks
  let base64String = '';
  
  try {
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64String += String.fromCharCode.apply(null, [...chunk]);
    }
    
    return btoa(base64String);
  } catch (error) {
    console.error("Error during base64 conversion:", error);
    
    // If standard approach fails, try a more memory-efficient approach
    console.log("Trying alternative base64 conversion method");
    
    // Reset and try alternative encoding approach
    base64String = '';
    for (let i = 0; i < uint8Array.length; i++) {
      base64String += String.fromCharCode(uint8Array[i]);
    }
    
    try {
      return btoa(base64String);
    } catch (btoa_error) {
      console.error("Both base64 conversion methods failed:", btoa_error);
      throw new Error("Could not convert file to base64: memory limitation or file corruption");
    }
  }
}
