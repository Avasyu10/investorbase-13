export interface Section {
  id: string;
  title: string;
  type: string;
  score: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: number;
  name: string;
  overallScore: number;
  sections: Section[];
}

export interface CompanyDetailed {
  id: string;
  name: string;
  description?: string; // Add description field
  overallScore: number;
  reportId?: string;
  perplexityResponse?: string;
  perplexityRequestedAt?: string;
  assessmentPoints: string[];
  sections: Section[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  title: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}
