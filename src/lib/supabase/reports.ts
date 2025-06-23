
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

export async function downloadReport(fileUrl: string, userId?: string): Promise<Blob> {
  console.log('Downloading report:', { fileUrl, userId });
  
  try {
    // Try signed URL first for better reliability
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('report_pdfs')
      .createSignedUrl(fileUrl, 3600); // 1 hour expiry

    if (!signedUrlError && signedUrlData?.signedUrl) {
      const response = await fetch(signedUrlData.signedUrl);
      if (response.ok) {
        console.log('Successfully downloaded via signed URL');
        return await response.blob();
      }
    }

    // Fallback to public URL
    const { data: publicUrlData } = supabase.storage
      .from('report_pdfs')
      .getPublicUrl(fileUrl);

    if (publicUrlData.publicUrl) {
      const response = await fetch(publicUrlData.publicUrl);
      if (response.ok) {
        console.log('Successfully downloaded via public URL');
        return await response.blob();
      }
    }

    // Final fallback to direct download
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(fileUrl);

    if (error || !data) {
      console.error('All download methods failed:', error);
      throw error || new Error('Failed to download report');
    }

    console.log('Successfully downloaded via direct download');
    return data;
  } catch (err) {
    console.error('Download error:', err);
    throw new Error(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
