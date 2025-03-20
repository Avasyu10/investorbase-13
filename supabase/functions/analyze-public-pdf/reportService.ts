
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
      persistSession: false,
    },
    global: {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  });

  console.log(`Getting report data for reportId: ${reportId}`);

  // Validate reportId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!reportId || !uuidRegex.test(reportId)) {
    console.error(`Invalid reportId format: "${reportId}"`);
    throw new Error(`Invalid report ID format. Expected a UUID, got: ${reportId}`);
  }

  // Get the report
  console.log(`Executing query to fetch report with ID: ${reportId}`);
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('id, title, user_id, pdf_url, is_public_submission, submission_form_id')
    .eq('id', reportId)
    .maybeSingle();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw new Error('Database error: ' + reportError.message);
  }
  
  if (!reportData) {
    console.error(`Report with ID ${reportId} not found`);
    throw new Error(`Report with ID ${reportId} not found`);
  }

  const report = reportData;
  
  if (!report.pdf_url) {
    console.error(`Report ${reportId} does not have a PDF URL`);
    throw new Error(`Report is missing PDF file reference`);
  }
  
  console.log(`Found report: ${report.title}, user_id: ${report.user_id}, is_public_submission: ${report.is_public_submission}`);

  // For public submissions, we need to check for form slug to build the correct path
  let formSlug = '';
  if (report.is_public_submission) {
    console.log("This is a public submission - checking public_form_submissions table");
    
    const { data: submissionData, error: submissionError } = await supabase
      .from('public_form_submissions')
      .select('form_slug')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (!submissionError && submissionData && submissionData.form_slug) {
      formSlug = submissionData.form_slug;
      console.log(`Found matching public submission with form_slug: ${formSlug}`);
    }
  }

  // Define potential storage bucket names to try
  const potentialBucketNames = ['public_uploads', 'Public Uploads', 'public-uploads', 'public uploads'];
  
  console.log("Checking which storage bucket exists...");
  
  // List all buckets to find the correct one
  let availableBuckets: string[] = [];
  let correctBucketName: string | null = null;
  
  try {
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error("Error listing storage buckets:", bucketsError);
      throw new Error(`Storage access error: ${bucketsError.message}`);
    }
    
    if (buckets && buckets.length > 0) {
      availableBuckets = buckets.map(b => b.name);
      console.log("Available buckets:", availableBuckets.join(', '));
      
      // Find the first matching bucket from our potential names
      for (const potentialName of potentialBucketNames) {
        if (availableBuckets.includes(potentialName)) {
          correctBucketName = potentialName;
          console.log(`Found matching bucket: '${correctBucketName}'`);
          break;
        }
      }
      
      // If none of our potential names match, try a case-insensitive match
      if (!correctBucketName) {
        for (const bucketName of availableBuckets) {
          for (const potentialName of potentialBucketNames) {
            if (bucketName.toLowerCase() === potentialName.toLowerCase()) {
              correctBucketName = bucketName;
              console.log(`Found case-insensitive matching bucket: '${correctBucketName}'`);
              break;
            }
          }
          if (correctBucketName) break;
        }
      }
    } else {
      console.log("No storage buckets found!");
    }
  } catch (bucketsError) {
    console.error("Error checking buckets:", bucketsError);
    // Continue with the default name, we'll handle errors later
  }

  // If we couldn't find a matching bucket, fall back to 'public_uploads'
  if (!correctBucketName) {
    console.warn("Could not find a matching public uploads bucket, falling back to 'public_uploads'");
    correctBucketName = 'public_uploads';
  }

  // Try multiple download approaches sequentially until one succeeds
  let pdfData = null;
  let errorDetails: Record<string, any> = {};
  let successPath = null;
  
  // All possible paths to try for the PDF
  const pathsToTry = [
    // Direct path as stored in the database
    report.pdf_url,
    // Try with form slug if available
    formSlug ? `${formSlug}/${report.pdf_url.split('/').pop() || report.pdf_url}` : null,
    // Just the filename without any path
    report.pdf_url.includes('/') ? report.pdf_url.split('/').pop() : null,
  ].filter(Boolean) as string[]; // Remove null paths
  
  // Add additional paths by listing files in the storage bucket
  try {
    const { data: rootFiles, error: rootListError } = await supabase
      .storage
      .from(correctBucketName)
      .list();
      
    if (!rootListError && rootFiles && rootFiles.length > 0) {
      console.log(`Found ${rootFiles.length} files/folders in ${correctBucketName} bucket`);
      
      // Extract the filename from the pdf_url
      const fileName = report.pdf_url.split('/').pop() || report.pdf_url;
      
      // Check each item to see if it's a file or folder
      for (const item of rootFiles) {
        if (item.id && item.name) {
          if (!item.metadata) {
            // This is likely a folder - check it as another potential path
            pathsToTry.push(`${item.name}/${fileName}`);
            
            // Also try to list the folder contents
            const { data: folderFiles, error: folderError } = await supabase
              .storage
              .from(correctBucketName)
              .list(item.name);
              
            if (!folderError && folderFiles && folderFiles.length > 0) {
              // Look for the file directly inside this folder
              const matchingFile = folderFiles.find(file => file.name === fileName);
              if (matchingFile) {
                console.log(`Found exact match in folder ${item.name}: ${matchingFile.name}`);
                // Add this path at the beginning since it's more likely to be correct
                pathsToTry.unshift(`${item.name}/${fileName}`);
              }
            }
          } else if (item.name === fileName) {
            // Direct match in root
            console.log(`Found exact match in root: ${item.name}`);
            pathsToTry.unshift(item.name);
          }
        }
      }
    }
  } catch (listError) {
    // Non-fatal error, just log it
    console.log("Could not list storage files:", listError);
  }
  
  // Remove duplicates
  const uniquePaths = [...new Set(pathsToTry)];
  
  console.log("Will try these paths to download the PDF:", uniquePaths);
  
  // Try all possible paths sequentially
  for (const path of uniquePaths) {
    try {
      console.log(`Attempting to download PDF from path: ${path} in bucket: ${correctBucketName}`);
      const { data, error } = await supabase
        .storage
        .from(correctBucketName)
        .download(path);
        
      if (error) {
        console.log(`Error downloading from path ${path}:`, error);
        errorDetails[path] = JSON.stringify(error);
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
      errorDetails[path] = JSON.stringify(error);
    }
  }

  // Recursive search for the file if we haven't found it yet
  if (!pdfData) {
    console.log("Standard paths failed, trying recursive search...");
    
    async function findFileRecursively(folder = '') {
      const { data: files, error } = await supabase
        .storage
        .from(correctBucketName)
        .list(folder);
        
      if (error) {
        console.error(`Error listing files in ${folder || 'root'}:`, error);
        return null;
      }
      
      if (!files || files.length === 0) {
        return null;
      }
      
      // Extract the filename from the pdf_url
      const fileName = report.pdf_url.split('/').pop() || report.pdf_url;
      
      // Check for direct match
      const match = files.find(f => f.name === fileName && f.metadata);
      if (match) {
        const fullPath = folder ? `${folder}/${fileName}` : fileName;
        console.log(`Found match: ${fullPath}`);
        return fullPath;
      }
      
      // Recursively check folders
      for (const item of files) {
        if (item.id && !item.metadata) { // This is a folder
          const subFolder = folder ? `${folder}/${item.name}` : item.name;
          const result = await findFileRecursively(subFolder);
          if (result) return result;
        }
      }
      
      return null;
    }
    
    const foundPath = await findFileRecursively();
    if (foundPath) {
      console.log(`Recursive search found the file at: ${foundPath}, attempting download`);
      const { data, error } = await supabase
        .storage
        .from(correctBucketName)
        .download(foundPath);
        
      if (!error && data && data.size > 0) {
        console.log(`Successfully downloaded PDF via recursive search: ${foundPath}`);
        pdfData = data;
        successPath = foundPath;
      } else {
        if (error) console.error("Recursive search download error:", error);
        else console.error("Recursive search download returned empty file");
      }
    } else {
      console.log("Could not find file via recursive search");
    }
  }

  // If still no PDF, throw error
  if (!pdfData) {
    throw new Error(`Error downloading PDF: ${JSON.stringify(errorDetails)}`);
  }

  console.log(`PDF downloaded successfully from path: ${successPath}, size: ${pdfData.size} bytes, converting to base64`);

  // Convert PDF to base64
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
