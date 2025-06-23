
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

export async function downloadReport(fileUrl: string, userId?: string, reportId?: string): Promise<Blob> {
  console.log('=== DOWNLOAD REPORT START ===');
  console.log('Input parameters:', { fileUrl, userId, reportId });
  
  try {
    let report = null;
    let actualUserId = userId;
    
    // If we have reportId, get the report details to find the correct user
    if (reportId) {
      console.log('Fetching report details for ID:', reportId);
      report = await getReportById(reportId);
      actualUserId = report.user_id || userId;
      console.log('Report from database:', {
        id: report.id,
        title: report.title,
        pdf_url: report.pdf_url,
        user_id: report.user_id,
        is_public_submission: report.is_public_submission
      });
    }
    
    if (!actualUserId) {
      throw new Error('User ID is required to download the report');
    }
    
    const bucketName = 'report-pdfs';
    const filePath = `${actualUserId}/${fileUrl}`;
    
    console.log(`Downloading from bucket: ${bucketName}, path: ${filePath}`);
    
    // Try direct download
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (!error && data && data.size > 0) {
      console.log('✅ Download successful!', {
        bucket: bucketName,
        path: filePath,
        size: data.size,
        type: data.type
      });
      return data;
    }
    
    console.log('❌ Download failed:', error?.message || 'No data/empty file');
    throw new Error(`Failed to download file: ${error?.message || 'File not found'}`);
    
  } catch (err) {
    console.error('=== DOWNLOAD REPORT ERROR ===');
    console.error('Error details:', err);
    throw new Error(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
