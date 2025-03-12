
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
