import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useStartupCompanyDetails(submissionId: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["startup-company-details", submissionId],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view this submission",
          variant: "destructive",
        });
        throw new Error("User not authenticated");
      }

      // Fetch the startup submission
      const { data: submission, error: submissionError } = await supabase
        .from("startup_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (submissionError) {
        console.error("Error fetching startup submission:", submissionError);
        throw submissionError;
      }

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Fetch evaluation data for this submission
      const { data: evaluations, error: evalError } = await supabase
        .from("submission_evaluations")
        .select("*")
        .or(`startup_submission_id.eq.${submissionId},startup_name.eq.${submission.startup_name}`);

      if (evalError) {
        console.error("Error fetching evaluations:", evalError);
      }

      // Find the best matching evaluation
      const evaluation: any = evaluations?.find((e: any) => e.startup_submission_id === submissionId) 
        || evaluations?.find((e: any) => e.startup_name === submission.startup_name);

      // Calculate overall score from evaluation
      let overallScore = null;
      if (evaluation) {
        if (evaluation.overall_average) {
          overallScore = evaluation.overall_average;
        } else {
          const scoreKeys = Object.keys(evaluation).filter(
            (key) => key.endsWith('_score') && evaluation[key] !== null
          );
          if (scoreKeys.length > 0) {
            const scores = scoreKeys.map((key) => evaluation[key]);
            overallScore = scores.reduce((acc: number, score: number) => acc + score, 0) / scores.length;
          }
        }
      }

      // Transform the data to match the Company interface structure
      const transformedCompany = {
        id: submission.id,
        name: submission.startup_name,
        created_at: submission.created_at,
        updated_at: submission.created_at,
        user_id: submission.user_id,
        overall_score: overallScore || 0,
        assessment_points: evaluation ? [
          (evaluation as any).problem_clarity_score ? `Problem Clarity: ${(evaluation as any).problem_clarity_score}/20` : null,
          (evaluation as any).market_understanding_score ? `Market Understanding: ${(evaluation as any).market_understanding_score}/20` : null,
          (evaluation as any).solution_quality_score ? `Solution Quality: ${(evaluation as any).solution_quality_score}/20` : null,
          (evaluation as any).team_capability_score ? `Team Capability: ${(evaluation as any).team_capability_score}/20` : null,
          (evaluation as any).traction_score ? `Traction: ${(evaluation as any).traction_score}/20` : null,
        ].filter(Boolean) : [],
        source: 'startup_submission',
        // Additional details
        website: (submission as any).website || '',
        stage: (submission as any).stage || 'Early Stage',
        industry: (submission as any).industry || 'Not specified',
        introduction: submission.problem_statement || `${submission.startup_name} is an innovative startup. View their detailed evaluation below.`,
        email: submission.founder_email,
        report_id: null,
        sections: [],
        // Include raw submission and evaluation data
        _rawSubmission: submission,
        _rawEvaluation: evaluation,
      };

      return transformedCompany;
    },
    enabled: !!submissionId,
  });
}
