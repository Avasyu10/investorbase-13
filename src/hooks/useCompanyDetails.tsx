
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SectionDetailed {
  id: string;
  title: string;
  type: "team" | "product" | "market" | "business" | "financials" | "competition" | "other";
  score: number;
  description: string;
  detailedContent: string;
  strengths: {
    id: string;
    content: string;
  }[];
  weaknesses: {
    id: string;
    content: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDetailed {
  id: string;
  name: string;
  overallScore: number;
  reportId: string | null;
  perplexityResponse: string | null;
  perplexityRequestedAt: string | null;
  assessmentPoints: string[];
  sections: {
    id: string;
    title: string;
    type: "team" | "product" | "market" | "business" | "financials" | "competition" | "other";
    score: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export function useCompanyDetails(companyId?: string) {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      try {
        console.log("Fetching company details for ID:", companyId);
        
        // Try the direct query first
        const { data: companyData, error } = await supabase
          .from("companies")
          .select(`
            id, 
            name, 
            overall_score,
            created_at,
            updated_at,
            assessment_points,
            report_id,
            perplexity_response,
            perplexity_requested_at,
            sections (
              id,
              title,
              type,
              score
            )
          `)
          .eq("id", companyId)
          .maybeSingle();

        if (error) throw error;
        
        // If no company found directly, check if it's a public submission
        if (!companyData) {
          console.log("No company found directly, checking public submissions");
          
          // Look for companies created from public submissions
          const { data: publicCompany, error: publicError } = await supabase
            .rpc('get_company_by_numeric_id', { p_numeric_id: parseInt(companyId, 10) });
            
          if (publicError) {
            console.error("Error checking for public company:", publicError);
            throw publicError;
          }
          
          if (publicCompany && publicCompany.length > 0) {
            console.log("Found company via numeric ID:", publicCompany[0]);
            
            // Format the data to match our expected structure
            const { data: fullCompanyData, error: fullError } = await supabase
              .from("companies")
              .select(`
                id, 
                name, 
                overall_score,
                created_at,
                updated_at,
                assessment_points,
                report_id,
                perplexity_response,
                perplexity_requested_at,
                sections (
                  id,
                  title,
                  type,
                  score
                )
              `)
              .eq("id", publicCompany[0].id)
              .maybeSingle();
              
            if (fullError) throw fullError;
            
            if (fullCompanyData) {
              return transformCompanyData(fullCompanyData);
            }
          }
          
          throw new Error("Company not found");
        }
        
        return transformCompanyData(companyData);
      } catch (err) {
        console.error("Error in useCompanyDetails:", err);
        throw err;
      }
    },
    enabled: !!companyId,
    meta: {
      onError: (error: Error) => {
        console.error("Error fetching company details:", error);
        toast({
          title: "Error loading company details",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  });

  // Process returned data
  if (data && !company) {
    setCompany(data);
  }

  return {
    company,
    isLoading,
    error,
    refetch,
  };
}

// Helper to transform company data from DB to our app model
function transformCompanyData(companyData: any): CompanyDetailed {
  return {
    id: companyData.id,
    name: companyData.name,
    overallScore: companyData.overall_score,
    reportId: companyData.report_id,
    perplexityResponse: companyData.perplexity_response,
    perplexityRequestedAt: companyData.perplexity_requested_at,
    assessmentPoints: companyData.assessment_points || [],
    sections: (companyData.sections || []).map((section: any) => ({
      id: section.id,
      title: section.title,
      type: section.type,
      score: section.score,
    })),
    createdAt: companyData.created_at,
    updatedAt: companyData.updated_at
  };
}
