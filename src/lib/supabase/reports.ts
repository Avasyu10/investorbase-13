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

export async function uploadReportPdf(file: File, userId: string): Promise<string> {
  console.log('Uploading PDF to report-pdfs bucket:', file.name);
  
  // Generate a unique filename with timestamp
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  // Store directly in user folder structure
  const fullPath = `${userId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('report-pdfs')
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading PDF:', error);
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  console.log('PDF uploaded successfully to storage path:', data.path);
  // Return only the filename part, not the full path
  // This matches how the existing system expects it
  return fileName;
}

export async function createReportWithPdf(
  title: string, 
  description: string, 
  file: File, 
  userId: string
): Promise<Report> {
  // Upload the PDF and get just the filename
  const fileName = await uploadReportPdf(file, userId);
  
  console.log('Creating report with PDF filename:', fileName);
  
  // Store just the filename in the database (not the full path)
  // The full path will be constructed when needed for retrieval
  const { data, error } = await supabase
    .from('reports')
    .insert({
      title,
      description,
      pdf_url: fileName, // Store just the filename
      user_id: userId,
      analysis_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw new Error(`Failed to create report: ${error.message}`);
  }

  console.log('Report created successfully with PDF filename:', data.pdf_url);
  return data;
}

export async function getSignedPdfUrl(pdfPath: string): Promise<string> {
  console.log('Getting signed URL for PDF path:', pdfPath);
  
  const { data, error } = await supabase.storage
    .from('report-pdfs')
    .createSignedUrl(pdfPath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned');
  }

  console.log('Signed URL created successfully');
  return data.signedUrl;
}

export async function debugStorageBucket(): Promise<void> {
  console.log('=== STORAGE BUCKET DEBUG START ===');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('Available buckets:', buckets, 'Error:', bucketsError);
    
    // Check the report-pdfs bucket specifically
    const bucketName = 'report-pdfs';
    console.log(`Checking bucket: ${bucketName}`);
    
    // List files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 100 });
    
    console.log('Files in bucket root:', files, 'Error:', filesError);
    
    // If user exists, check their specific folder
    if (user) {
      const { data: userFiles, error: userFilesError } = await supabase.storage
        .from(bucketName)
        .list(user.id, { limit: 100 });
      
      console.log(`Files in user folder (${user.id}):`, userFiles, 'Error:', userFilesError);
    }
    
  } catch (err) {
    console.error('Debug error:', err);
  }
  
  console.log('=== STORAGE BUCKET DEBUG END ===');
}
