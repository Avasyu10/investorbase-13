import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useIITGuwahatiCompanyDetails(submissionId: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["iitguwahati-company-details", submissionId],
    queryFn: async () => {
      // Fetch the submission
      const { data: submission, error: submissionError } = await supabase
        .from("iitguwahati_form_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();

      if (submissionError) {
        console.error("Error fetching IIT Guwahati submission:", submissionError);
        throw submissionError;
      }

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Fetch evaluation data for this submission
      const { data: evaluation, error: evalError } = await supabase
        .from("iitguwahati_evaluations")
        .select("*")
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (evalError) {
        console.error("Error fetching evaluation:", evalError);
      }

      // Transform the data to match the expected interface
      const transformedCompany = {
        id: submission.id,
        name: submission.startup_name,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        user_id: submission.user_id,
        overall_score: evaluation?.overall_score || 0,
        assessment_points: evaluation ? [
          evaluation.problem_score ? `Problem: ${evaluation.problem_score}/100` : null,
          evaluation.solution_score ? `Solution: ${evaluation.solution_score}/100` : null,
          evaluation.product_score ? `Product: ${evaluation.product_score}/100` : null,
          evaluation.business_model_score ? `Business Model: ${evaluation.business_model_score}/100` : null,
          evaluation.finances_score ? `Finances: ${evaluation.finances_score}/100` : null,
          evaluation.patents_legalities_score ? `Patents & Legalities: ${evaluation.patents_legalities_score}/100` : null,
          evaluation.future_goals_score ? `Future Goals: ${evaluation.future_goals_score}/100` : null,
        ].filter(Boolean) : [],
        source: 'iitguwahati_submission',
        // Additional details from submission
        website: '',
        stage: submission.product_type_and_stage || 'Early Stage',
        industry: submission.domain_and_problem?.split(' ')[0] || 'Technology',
        introduction: evaluation?.overall_summary || submission.unique_proposition || `${submission.startup_name} is an innovative startup.`,
        email: submission.submitter_email,
        founder_name: submission.founder_name,
        linkedin_url: submission.linkedin_url,
        phone_number: submission.phone_number,
        // Raw data for display
        _rawSubmission: submission,
        _rawEvaluation: evaluation,
      };

      return transformedCompany;
    },
    enabled: !!submissionId,
  });
}
