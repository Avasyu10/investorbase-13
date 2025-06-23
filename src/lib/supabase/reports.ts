
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
