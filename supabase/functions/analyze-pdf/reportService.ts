
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function getReportData(reportId: string, authHeader: string = '') {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase configuration");
    throw new Error('Supabase configuration is missing');
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // Disable session persistence to prevent the warning
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins
      },
    },
  });

  console.log(`Getting report data for reportId: ${reportId}`);

  // Validate reportId format - check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

  // Get the specific report without any filters or restrictions
  console.log(`Executing query to fetch report with ID: ${reportId}`);
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('id, title, user_id, pdf_url, is_public_submission')
    .eq('id', reportId)
    .maybeSingle();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }
  
  if (!reportData) {
    // Log more information to help debug the issue
    console.error(`Report with ID ${reportId} not found`);
    
    // Let's also try a generic query to see if there are any reports at all
    const { data: allReports, error: allReportsError } = await supabase
      .from('reports')
      .select('id')
      .limit(5);
      
    if (allReportsError) {
      console.error("Error checking for all reports:", allReportsError);
    } else {
      console.log(`Found ${allReports.length} reports in the database. First few IDs:`, 
        allReports.map(r => r.id).join(", "));
    }
    
    throw new Error(`Report with ID ${reportId} not found`);
  }

  const report = reportData;
  
  if (!report.pdf_url) {
    console.error(`Report ${reportId} does not have a PDF URL`);
    throw new Error(`Report is missing PDF file reference`);
  }
  
  console.log(`Found report: ${report.title}, user_id: ${report.user_id}, is_public_submission: ${report.is_public_submission}, accessing PDF from storage`);

  // First, let's check if we can find additional information about storage paths
  // for this particular report in the database
  let additionalStoragePaths: string[] = [];
  let storagePrefix = '';

  if (report.is_public_submission) {
    console.log("This is a public submission - checking public_form_submissions table");
    // For public submissions, check the public_form_submissions table
    const { data: submissionData, error: submissionError } = await supabase
      .from('public_form_submissions')
      .select('pdf_url, form_slug')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (!submissionError && submissionData && submissionData.pdf_url) {
      console.log(`Found matching public submission with pdf_url: ${submissionData.pdf_url}, form_slug: ${submissionData.form_slug}`);
      if (submissionData.pdf_url !== report.pdf_url) {
        additionalStoragePaths.push(submissionData.pdf_url);
      }
      
      // Check for form-specific storage pattern
      if (submissionData.form_slug) {
        additionalStoragePaths.push(`${submissionData.form_slug}/${report.pdf_url.split('/').pop() || report.pdf_url}`);
      }
    }
    
    // Public submissions often use a different storage pattern
    storagePrefix = 'public_submissions';
  } else {
    // For regular uploads, try with user_id as prefix
    storagePrefix = report.user_id || '';
  }
  
  // Try to list files in the storage bucket to find possible matches
  try {
    console.log("Trying to list files in storage to find potential matches");
    const { data: files, error: listError } = await supabase
      .storage
      .from('report_pdfs')
      .list();
      
    if (!listError && files && files.length > 0) {
      console.log(`Found ${files.length} files in storage bucket. Looking for matches with ${report.pdf_url}`);
      
      // Extract the filename from the pdf_url
      const fileName = report.pdf_url.split('/').pop() || report.pdf_url;
      
      // Look for any files or folders that might contain our file
      for (const file of files) {
        // If it's a folder, add a potential path with this folder
        if (file.id && file.name) {
          if (!file.metadata) {
            // This is likely a folder
            additionalStoragePaths.push(`${file.name}/${fileName}`);
          } else if (file.name === fileName) {
            // Direct match - add to beginning of paths to try
            additionalStoragePaths.unshift(file.name);
          }
        }
      }
    }
  } catch (listError) {
    // Non-fatal error, just log it
    console.log("Could not list storage files:", listError);
  }

  // Try multiple download approaches sequentially until one succeeds
  let pdfData = null;
  let errorDetails = {};
  let successPath = null;
  
  // All possible paths to try for the PDF
  const pathsToTry = [
    // Direct path as stored in the database
    report.pdf_url,
    // Try with public submissions prefix if it's a public submission
    storagePrefix ? `${storagePrefix}/${report.pdf_url.split('/').pop() || report.pdf_url}` : null,
    // Try with user_id prefix if available
    report.user_id ? `${report.user_id}/${report.pdf_url.split('/').pop() || report.pdf_url}` : null,
    // Just the filename without any path
    report.pdf_url.includes('/') ? report.pdf_url.split('/').pop() : null,
    // Add all the additional paths we discovered
    ...additionalStoragePaths
  ].filter(Boolean); // Remove null paths
  
  // Remove duplicates
  const uniquePaths = [...new Set(pathsToTry)];
  
  console.log("Will try these paths to download the PDF:", uniquePaths);
  
  // Try all possible paths sequentially
  for (const path of uniquePaths) {
    try {
      console.log(`Attempting to download PDF from path: ${path}`);
      const { data, error } = await supabase
        .storage
        .from('report_pdfs')
        .download(path);
        
      if (error) {
        console.log(`Error downloading from path ${path}:`, error);
        errorDetails[path] = error.message;
        continue;
      }
      
      if (data && data.size > 0) {
        console.log(`Successfully downloaded PDF from path: ${path}, size: ${data.size} bytes`);
        pdfData = data;
        successPath = path;
        break; // Exit the loop if we found a working path
      } else {
        console.log(`Downloaded empty file from path: ${path}`);
        errorDetails[path] = "Empty file";
      }
    } catch (error) {
      console.error(`Exception when trying path ${path}:`, error);
      errorDetails[path] = error.message;
    }
  }

  // If we didn't find the PDF after trying all paths
  if (!pdfData) {
    console.error("All PDF download attempts failed:", JSON.stringify(errorDetails, null, 2));
    throw new Error(`Error downloading PDF: ${JSON.stringify(errorDetails)}`);
  }

  console.log(`PDF downloaded successfully from path: ${successPath}, size: ${pdfData.size} bytes, converting to base64`);

  // Convert PDF to base64 using a chunked approach to avoid stack overflow
  const pdfBase64 = await arrayBufferToBase64(await pdfData.arrayBuffer());

  if (!pdfBase64 || pdfBase64.length === 0) {
    console.error("PDF base64 conversion failed");
    throw new Error('Failed to convert PDF to base64');
  }

  console.log(`PDF base64 conversion successful, length: ${pdfBase64.length}`);

  return { supabase, report, pdfBase64 };
}

// Helper function to convert ArrayBuffer to base64 in chunks to avoid stack overflow
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in smaller chunks
  let base64String = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    base64String += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(base64String);
}
