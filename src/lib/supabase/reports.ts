
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
  console.log('Downloading report:', { fileUrl, userId, reportId });
  
  try {
    let actualFilePath = fileUrl;
    
    // If we have reportId, get the actual file path from the database
    if (reportId) {
      const report = await getReportById(reportId);
      actualFilePath = report.pdf_url;
      console.log('Retrieved file path from report:', actualFilePath);
      
      // If the file doesn't start with a user ID, prepend it
      if (report.user_id && !actualFilePath.includes('/')) {
        actualFilePath = `${report.user_id}/${actualFilePath}`;
        console.log('Using user-specific path:', actualFilePath);
      }
    }
    
    console.log('Attempting to download from path:', actualFilePath);
    
    // Try direct download first
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(actualFilePath);

    if (!error && data) {
      console.log('Successfully downloaded via direct download, size:', data.size);
      return data;
    }

    console.log('Direct download failed:', error?.message);

    // Try signed URL as fallback
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('report_pdfs')
      .createSignedUrl(actualFilePath, 3600); // 1 hour expiry

    if (!signedUrlError && signedUrlData?.signedUrl) {
      const response = await fetch(signedUrlData.signedUrl);
      if (response.ok) {
        console.log('Successfully downloaded via signed URL');
        return await response.blob();
      }
    }

    // Try public URL as final fallback
    const { data: publicUrlData } = supabase.storage
      .from('report_pdfs')
      .getPublicUrl(actualFilePath);

    if (publicUrlData.publicUrl) {
      const response = await fetch(publicUrlData.publicUrl);
      if (response.ok) {
        console.log('Successfully downloaded via public URL');
        return await response.blob();
      }
    }

    throw new Error(`All download methods failed for path: ${actualFilePath}`);
  } catch (err) {
    console.error('Download error:', err);
    throw new Error(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
