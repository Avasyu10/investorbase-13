import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface StartupSubmission {
  id: string;
  startup_name: string;
  founder_email: string;
  problem_statement: string;
  solution: string;
  created_at: string;
  linkedin_profile_url?: string;
  market_understanding?: string;
  customer_understanding?: string;
  competitive_understanding?: string;
  unique_selling_proposition?: string;
  technical_understanding?: string;
  vision?: string;
}

interface SubmissionEvaluation {
  id: string;
  startup_submission_id?: string;
  startup_name: string;
  overall_average: number;
  problem_statement_score?: number;
  solution_score?: number;
  market_understanding_score?: number;
  customer_understanding_score?: number;
  competitive_understanding_score?: number;
  unique_selling_proposition_score?: number;
  technical_understanding_score?: number;
  vision_score?: number;
  ai_analysis_summary?: string;
  ai_recommendations?: string;
  created_at: string;
}

interface CompanyEnrichment {
  id: string;
  company_id: string;
  market_analysis?: string;
  competitive_landscape?: string;
  growth_potential?: string;
  risk_factors?: string;
  investment_thesis?: string;
  enrichment_data?: any;
  created_at: string;
  updated_at: string;
}

export function useStartupDetails(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch company data
  const {
    data: company,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("No company ID provided");

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch startup submission
  const {
    data: submission,
    isLoading: submissionLoading,
  } = useQuery({
    queryKey: ["startup-submission", company?.id],
    queryFn: async () => {
      if (!company?.name) return null;

      const { data, error } = await supabase
        .from("startup_submissions")
        .select("*")
        .eq("startup_name", company.name)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching startup submission:", error);
        return null;
      }

      return data as StartupSubmission | null;
    },
    enabled: !!company?.name,
  });

  // Fetch submission evaluation
  const {
    data: evaluation,
    isLoading: evaluationLoading,
  } = useQuery({
    queryKey: ["submission-evaluation", submission?.id, company?.name],
    queryFn: async () => {
      if (!submission?.id && !company?.name) return null;

      let query = supabase
        .from("submission_evaluations")
        .select("*");

      // Try to match by submission_id first, fallback to startup_name
      if (submission?.id) {
        query = query.eq("startup_submission_id", submission.id);
      } else if (company?.name) {
        query = query.eq("startup_name", company.name);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching submission evaluation:", error);
        return null;
      }

      return data as SubmissionEvaluation | null;
    },
    enabled: !!submission?.id || !!company?.name,
  });

  // Fetch company enrichment from Gemini
  const {
    data: enrichment,
    isLoading: enrichmentLoading,
  } = useQuery({
    queryKey: ["company-enrichment", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("company_enrichment")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching company enrichment:", error);
      }

      return data as CompanyEnrichment | null;
    },
    enabled: !!companyId,
  });

  // Trigger enrichment if not exists
  useEffect(() => {
    const triggerEnrichment = async () => {
      if (!companyId || !company || enrichment || enrichmentLoading) return;

      try {
        console.log("Triggering company enrichment for:", companyId);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.functions.invoke("enrich-company-data", {
          body: { companyId, userId: user.id },
        });

        if (error) {
          console.error("Error enriching company:", error);
        } else {
          // Refresh enrichment data after a delay
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["company-enrichment", companyId] });
          }, 5000);
        }
      } catch (error) {
        console.error("Error triggering enrichment:", error);
      }
    };

    triggerEnrichment();
  }, [companyId, company, enrichment, enrichmentLoading, queryClient]);

  // Show error toast if company fetch fails
  useEffect(() => {
    if (companyError) {
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive",
      });
    }
  }, [companyError, toast]);

  const isLoading = companyLoading || submissionLoading || evaluationLoading || enrichmentLoading;

  // Transform data to match expected format
  const transformedData = company ? {
    id: company.id,
    name: company.name,
    overall_score: evaluation?.overall_average || company.overall_score || 0,
    website: submission?.linkedin_profile_url || "",
    stage: "Early Stage",
    industry: company.industry || "Technology",
    introduction: submission?.problem_statement || "",
    description: submission?.solution || "",
    assessment_points: enrichment ? [
      enrichment.market_analysis,
      enrichment.competitive_landscape,
      enrichment.growth_potential,
      enrichment.risk_factors,
      enrichment.investment_thesis,
    ].filter(Boolean) : [],
    sections: createSectionsFromSubmission(submission, evaluation),
    user_id: company.user_id,
    created_at: company.created_at,
    updated_at: company.updated_at,
    submission,
    evaluation,
    enrichment,
  } : null;

  return {
    company: transformedData,
    isLoading,
    error: companyError,
  };
}

// Helper function to create sections from submission and evaluation data
function createSectionsFromSubmission(
  submission: StartupSubmission | null | undefined,
  evaluation: SubmissionEvaluation | null | undefined
) {
  if (!submission && !evaluation) return [];

  const sections = [];

  // Problem Statement section
  if (submission?.problem_statement) {
    sections.push({
      id: "problem-statement",
      title: "Problem Statement",
      type: "PROBLEM_STATEMENT",
      score: evaluation?.problem_statement_score || 0,
      description: submission.problem_statement,
      strengths: [],
      weaknesses: [],
    });
  }

  // Solution section
  if (submission?.solution) {
    sections.push({
      id: "solution",
      title: "Solution",
      type: "SOLUTION",
      score: evaluation?.solution_score || 0,
      description: submission.solution,
      strengths: [],
      weaknesses: [],
    });
  }

  // Market Understanding section
  if (submission?.market_understanding) {
    sections.push({
      id: "market",
      title: "Market Understanding",
      type: "MARKET",
      score: evaluation?.market_understanding_score || 0,
      description: submission.market_understanding,
      strengths: [],
      weaknesses: [],
    });
  }

  // Customer Understanding section
  if (submission?.customer_understanding) {
    sections.push({
      id: "customer",
      title: "Customer Understanding",
      type: "CUSTOMER",
      score: evaluation?.customer_understanding_score || 0,
      description: submission.customer_understanding,
      strengths: [],
      weaknesses: [],
    });
  }

  // Competitive Understanding section
  if (submission?.competitive_understanding) {
    sections.push({
      id: "competition",
      title: "Competitive Landscape",
      type: "COMPETITION",
      score: evaluation?.competitive_understanding_score || 0,
      description: submission.competitive_understanding,
      strengths: [],
      weaknesses: [],
    });
  }

  // USP section
  if (submission?.unique_selling_proposition) {
    sections.push({
      id: "usp",
      title: "Unique Selling Proposition",
      type: "USP",
      score: evaluation?.unique_selling_proposition_score || 0,
      description: submission.unique_selling_proposition,
      strengths: [],
      weaknesses: [],
    });
  }

  // Technical Understanding section
  if (submission?.technical_understanding) {
    sections.push({
      id: "technical",
      title: "Technical Understanding",
      type: "TECHNICAL",
      score: evaluation?.technical_understanding_score || 0,
      description: submission.technical_understanding,
      strengths: [],
      weaknesses: [],
    });
  }

  // Vision section
  if (submission?.vision) {
    sections.push({
      id: "vision",
      title: "Vision",
      type: "VISION",
      score: evaluation?.vision_score || 0,
      description: submission.vision,
      strengths: [],
      weaknesses: [],
    });
  }

  return sections;
}
