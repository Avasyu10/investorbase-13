
// This file is deprecated. Import the Supabase client from '@/integrations/supabase/client' instead.
import { supabase } from '@/integrations/supabase/client';

// Re-export for backward compatibility
export { supabase };

// Re-export types for backward compatibility
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  user_id: string;
  company_id?: string;
  analysis_status?: string;
  analysis_error?: string;
};

// Re-export the functions from the new location
export {
  getReports,
  getReportById,
  downloadReport,
  uploadReport,
  analyzeReport,
  analyzeReportDirect
} from './supabase/reports';
