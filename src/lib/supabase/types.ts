
import { ParsedPdfSegment } from '../pdf-parser';

export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  sections?: string[];
  parsedSegments?: ParsedPdfSegment[];
  user_id?: string;
};
