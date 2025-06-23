
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
  console.log('Downloading report with params:', { fileUrl, userId, reportId });
  
  try {
    let filePath = fileUrl;
    
    // If we have reportId, get the report details
    if (reportId) {
      console.log('Fetching report details for ID:', reportId);
      const report = await getReportById(reportId);
      filePath = report.pdf_url;
      console.log('Report PDF URL from database:', filePath);
      
      // Construct the proper file path
      if (report.user_id && !filePath.startsWith(report.user_id)) {
        // If the path doesn't already include the user ID, prepend it
        filePath = `${report.user_id}/${filePath}`;
        console.log('Using user-specific path:', filePath);
      }
    }
    
    console.log('Final file path for download:', filePath);
    
    // Method 1: Try direct download
    console.log('Attempting direct download...');
    const { data: directData, error: directError } = await supabase.storage
      .from('report_pdfs')
      .download(filePath);

    if (!directError && directData) {
      console.log('Direct download successful, blob size:', directData.size);
      return directData;
    }
    
    console.log('Direct download failed:', directError?.message);

    // Method 2: Try with signed URL
    console.log('Attempting signed URL download...');
    const { data: urlData, error: urlError } = await supabase.storage
      .from('report_pdfs')
      .createSignedUrl(filePath, 60);

    if (!urlError && urlData?.signedUrl) {
      console.log('Signed URL created, fetching file...');
      const response = await fetch(urlData.signedUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('Signed URL download successful, blob size:', blob.size);
        return blob;
      } else {
        console.log('Signed URL fetch failed:', response.status, response.statusText);
      }
    } else {
      console.log('Signed URL creation failed:', urlError?.message);
    }

    // Method 3: Try public URL
    console.log('Attempting public URL download...');
    const { data: publicData } = supabase.storage
      .from('report_pdfs')
      .getPublicUrl(filePath);

    if (publicData.publicUrl) {
      console.log('Public URL:', publicData.publicUrl);
      const response = await fetch(publicData.publicUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('Public URL download successful, blob size:', blob.size);
        return blob;
      } else {
        console.log('Public URL fetch failed:', response.status, response.statusText);
      }
    }

    throw new Error(`All download methods failed for path: ${filePath}`);
    
  } catch (err) {
    console.error('Download error details:', err);
    throw new Error(`Failed to download report: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
