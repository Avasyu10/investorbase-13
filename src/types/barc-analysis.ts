
export interface BarcAnalysisResult {
  overall_score: number;
  recommendation: 'Accept' | 'Consider' | 'Reject';
  sections: {
    problem_solution_fit?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
    market_opportunity?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
    competitive_advantage?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
    team_strength?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
    execution_plan?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
    overall_assessment?: {
      score: number;
      analysis: string;
      strengths: string[];
      improvements: string[];
    };
  };
  summary?: {
    key_factors: string[];
    next_steps: string[];
    overall_feedback: string;
  };
}

export interface BarcSubmission {
  id: string;
  company_name: string;
  company_type: string;
  company_registration_type: string;
  executive_summary: string;
  submitter_email?: string;
  created_at: string;
  analysis_status?: string;
  analysis_result?: BarcAnalysisResult;
}
