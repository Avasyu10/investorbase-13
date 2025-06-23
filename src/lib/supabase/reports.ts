
import { supabase } from '@/integrations/supabase/client';

export interface Report {
  id: string;
  title: string;
  description?: string;
  pdf_url: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  is_public_submission?: boolean;
  submitter_email?: string;
  analysis_status?: string;
  analysis_error?: string;
}

export async function getReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }

  return data || [];
}

export async function getReportById(reportId: string): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    console.error('Error fetching report:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Report not found');
  }

  return data;
}

export async function analyzeReport(reportId: string): Promise<void> {
  console.log('Starting analysis for report:', reportId);
  
  const { error } = await supabase.functions.invoke('analyze-pdf', {
    body: { reportId }
  });

  if (error) {
    console.error('Analysis error:', error);
    throw new Error(`Failed to start analysis: ${error.message}`);
  }
}

// Enhanced debugging function to check storage bucket contents
export async function debugStorageBucket(): Promise<void> {
  console.log('=== DEBUGGING STORAGE BUCKET ===');
  
  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  console.log('Available buckets:', buckets);
  if (bucketsError) console.error('Buckets error:', bucketsError);
  
  // Check the report-pdfs bucket
  const bucketName = 'report-pdfs';
  
  console.log(`\n--- Checking bucket: ${bucketName} ---`);
  
  const { data: files, error: filesError } = await supabase.storage
    .from(bucketName)
    .list('', { limit: 100 });
  
  console.log(`Files in "${bucketName}" bucket (root):`, files);
  if (filesError) console.error(`Files listing error for ${bucketName}:`, filesError);
  
  // List files with user folders
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.name) {
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from(bucketName)
          .list(file.name, { limit: 100 });
        console.log(`Files in folder ${file.name} (bucket ${bucketName}):`, folderFiles);
        if (folderError) console.error(`Folder ${file.name} error:`, folderError);
      }
    }
  }
}

export async function downloadReport(fileUrl: string, userId?: string, reportId?: string): Promise<Blob> {
  console.log('=== DOWNLOAD REPORT DEBUG START ===');
  console.log('Input parameters:', { fileUrl, userId, reportId });
  
  // First, debug the storage bucket
  await debugStorageBucket();
  
  try {
    let filePath = fileUrl;
    let report = null;
    
    // If we have reportId, get the report details
    if (reportId) {
      console.log('Fetching report details for ID:', reportId);
      report = await getReportById(reportId);
      filePath = report.pdf_url;
      console.log('Report from database:', {
        id: report.id,
        title: report.title,
        pdf_url: report.pdf_url,
        user_id: report.user_id,
        is_public_submission: report.is_public_submission
      });
    }
    
    console.log('Original file path:', filePath);
    
    // Try different path combinations
    const pathsToTry = [
      filePath, // Original path
      userId ? `${userId}/${filePath}` : null, // User-specific path
      report?.user_id ? `${report.user_id}/${filePath}` : null, // Report user path
      filePath.startsWith('/') ? filePath.substring(1) : `/${filePath}`, // With/without leading slash
    ].filter(Boolean);
    
    console.log('Paths to try:', pathsToTry);
    
    // Use the correct bucket name
    const bucketName = 'report-pdfs';
    
    console.log(`\n=== TRYING BUCKET: ${bucketName} ===`);
    
    for (const tryPath of pathsToTry) {
      console.log(`\n--- Trying path: ${tryPath} in bucket: ${bucketName} ---`);
      
      // Method 1: Try direct download
      console.log('Method 1: Direct download');
      const { data: directData, error: directError } = await supabase.storage
        .from(bucketName)
        .download(tryPath);

      if (!directError && directData && directData.size > 0) {
        console.log('✅ Direct download successful!', {
          bucket: bucketName,
          path: tryPath,
          size: directData.size,
          type: directData.type
        });
        return directData;
      }
      console.log('❌ Direct download failed:', directError?.message || 'No data/empty file');

      // Method 2: Try signed URL
      console.log('Method 2: Signed URL');
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(tryPath, 60);

      if (!urlError && urlData?.signedUrl) {
        console.log('Signed URL created:', urlData.signedUrl);
        try {
          const response = await fetch(urlData.signedUrl);
          console.log('Fetch response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              console.log('✅ Signed URL download successful!', {
                bucket: bucketName,
                path: tryPath,
                size: blob.size,
                type: blob.type
              });
              return blob;
            } else {
              console.log('❌ Signed URL returned empty blob');
            }
          } else {
            console.log('❌ Signed URL fetch failed:', response.status, response.statusText);
          }
        } catch (fetchError) {
          console.error('❌ Signed URL fetch exception:', fetchError);
        }
      } else {
        console.log('❌ Signed URL creation failed:', urlError?.message);
      }

      // Method 3: Try public URL
      console.log('Method 3: Public URL');
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(tryPath);

      if (publicData.publicUrl) {
        console.log('Public URL:', publicData.publicUrl);
        try {
          const response = await fetch(publicData.publicUrl);
          console.log('Public fetch response:', {
            status: response.status,
            statusText: response.statusText
          });
          
          if (response.ok) {
            const blob = await response.blob();
            if (blob.size > 0) {
              console.log('✅ Public URL download successful!', {
                bucket: bucketName,
                path: tryPath,
                size: blob.size,
                type: blob.type
              });
              return blob;
            } else {
              console.log('❌ Public URL returned empty blob');
            }
          } else {
            console.log('❌ Public URL fetch failed:', response.status, response.statusText);
          }
        } catch (fetchError) {
          console.error('❌ Public URL fetch exception:', fetchError);
        }
      }
    }

    console.log('=== DOWNLOAD REPORT DEBUG END ===');
    throw new Error(`All download methods failed. Tried bucket: ${bucketName}, Tried paths: ${pathsToTry.join(', ')}`);
    
  } catch (err) {
    console.error('=== DOWNLOAD REPORT ERROR ===');
    console.error('Error details:', err);
    console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
    throw new Error(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
