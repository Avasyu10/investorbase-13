
import { createClient } from '@supabase/supabase-js';

// These will be provided by Supabase integration
const supabaseUrl = '';
const supabaseAnonKey = '';

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
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }

  return data as Report[];
}

export async function getReportById(id: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching report:', error);
    throw error;
  }

  return data as Report;
}

export async function downloadReport(fileUrl: string) {
  const { data, error } = await supabase.storage.from('pdfs').download(fileUrl);

  if (error) {
    console.error('Error downloading report:', error);
    throw error;
  }

  return data;
}
