import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Evaluation {
  id: string;
  startup_name: string;
  problem_statement: string;
  existence_score: number;
  severity_score: number;
  frequency_score: number;
  unmet_need_score: number;
  average_score: number;
  ai_analysis_summary: string | null;
  ai_recommendations: string | null;
  created_at: string;
}

export const useEvaluations = () => {
  return useQuery({
    queryKey: ['problem-statement-evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problem_statement_evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Evaluation[];
    },
  });
};