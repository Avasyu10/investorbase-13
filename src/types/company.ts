
export interface Company {
  id: string;
  name: string;
  overall_score: number;
  scoring_reason?: string;
  assessment_points: string[];
  user_id: string;
  report_id?: string;
  created_at: string;
  updated_at: string;
  source: string;
  industry?: string;
  email?: string;
  poc_name?: string;
  phonenumber?: string;
  status?: string;
}
