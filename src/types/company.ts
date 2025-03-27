
export interface Section {
  id: string;
  title: string;
  description?: string;
  score: number;
  type?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface Company {
  id: string | number;
  name: string;
  overallScore?: number;
  assessmentPoints?: string[];
  sections?: Section[];
}
