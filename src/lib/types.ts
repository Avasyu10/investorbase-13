
export type Company = {
  id: string;
  name: string;
  total_score: number;
  logo_url: string | null;
  created_at: string;
};

export type Section = {
  id: string;
  company_id: string;
  name: string;
  score: number;
  max_score: number;
  description: string | null;
  created_at: string;
};

export type SectionDetail = {
  id: string;
  section_id: string;
  title: string;
  content: string;
  score_impact: string | null;
  created_at: string;
};
