
import { createClient } from '@supabase/supabase-js';

// These are provided by your Supabase project
const supabaseUrl = 'https://jhtnruktmtjqrfoiyrep.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  sections?: string[];
};

// Functions to interact with Supabase

export async function getReports() {
  // First try to get records from the reports table
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
  }

  // If we have records in the reports table, return them
  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData);
    return tableData as Report[];
  }

  // If no records in table, try to list files from storage
  console.log('No reports found in table, checking storage...');
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('reports')
    .list();

  if (storageError) {
    console.error('Error listing reports from storage:', storageError);
    throw storageError;
  }

  if (!storageData || storageData.length === 0) {
    console.log('No reports found in storage either');
    return [];
  }

  console.log('Found reports in storage:', storageData);
  
  // Create report objects from storage files
  const reports: Report[] = storageData
    .filter(file => file.name.endsWith('.pdf'))
    .map(file => {
      const fileName = file.name.replace('.pdf', '');
      return {
        id: file.id,
        title: fileName.replace(/_/g, ' '),
        description: `PDF report: ${fileName}`,
        pdf_url: file.name,
        created_at: file.created_at || new Date().toISOString(),
        sections: []
      };
    });

  return reports;
}

export async function getReportById(id: string) {
  // First try to get the report from the reports table
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
  }

  // If we found the report in the table, return it
  if (tableData) {
    return tableData as Report;
  }

  // If not found in table, try to get file details from storage
  console.log('Report not found in table, checking storage...');
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('reports')
    .list();

  if (storageError) {
    console.error('Error listing reports from storage:', storageError);
    throw storageError;
  }

  const file = storageData?.find(file => file.id === id);
  
  if (!file) {
    throw new Error('Report not found');
  }

  const fileName = file.name.replace('.pdf', '');
  return {
    id: file.id,
    title: fileName.replace(/_/g, ' '),
    description: `PDF report: ${fileName}`,
    pdf_url: file.name,
    created_at: file.created_at || new Date().toISOString(),
    sections: []
  } as Report;
}

export async function downloadReport(fileUrl: string) {
  const { data, error } = await supabase.storage.from('reports').download(fileUrl);

  if (error) {
    console.error('Error downloading report:', error);
    throw error;
  }

  return data;
}
