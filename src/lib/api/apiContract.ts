export interface MarketInsight {
  headline: string;
  content: string;
  source?: string;
  url?: string;
  title?: string; // For backward compatibility
}

export interface NewsItem {
  headline: string;
  content: string;
  source?: string;
  url?: string;
  title?: string; // For backward compatibility
}

export interface Company {
  id: string;
  name: string;
  overallScore: number;
  createdAt: string;
  updatedAt: string;
  score: number; // For backward compatibility
  assessmentPoints: any[];
  reportId: string | null;
  perplexityResponse: any;
  perplexityPrompt: string | null;
  perplexityRequestedAt: string | null;
  source: string;
}

export interface CompanyDetailed extends Company {
  sections: Section[];
  description?: string; // Added description field
}

export interface Section {
  id: string;
  type: string;
  title: string;
  score: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDetailed extends Section {
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
}

export interface Report {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentPoint {
  id: string;
  label: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type SortOrder = 'asc' | 'desc';
