
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

export async function downloadReport(fileUrl: string, userId: string): Promise<Blob> {
  console.log('Attempting to download report:', { fileUrl, userId });
  
  const strategies = [
    {
      name: 'user-specific path',
      path: `${userId}/${fileUrl}`,
      bucket: 'report_pdfs'
    },
    {
      name: 'direct path',
      path: fileUrl,
      bucket: 'report_pdfs'
    },
    {
      name: 'email attachments',
      path: fileUrl,
      bucket: 'email_attachments'
    }
  ];

  let lastError: any = null;
  
  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}:`, strategy.path);
      
      const { data, error } = await supabase.storage
        .from(strategy.bucket)
        .download(strategy.path);

      if (error) {
        console.log(`${strategy.name} failed:`, error.message);
        lastError = error;
        continue;
      }
      
      if (data) {
        console.log(`Successfully downloaded with ${strategy.name}`);
        return data;
      }
    } catch (error) {
      console.log(`Error with ${strategy.name}:`, error);
      lastError = error;
    }
  }
  
  // If all strategies failed, throw the last error
  console.error('All download strategies failed:', lastError);
  throw lastError || new Error('Failed to download report from all attempted paths');
}
