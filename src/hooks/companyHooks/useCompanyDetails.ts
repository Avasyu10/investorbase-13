
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Define function to check if input is a numeric ID
function isNumericId(id: string): boolean {
  return /^\d+$/.test(id);
}

export function useCompanyDetails(companyId?: string) {
  const [company, setCompany] = useState<any>(null);

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      try {
        console.log("Fetching company details for ID:", companyId);
        
        // If the ID is numeric (from a public submission), use the RPC function
        if (isNumericId(companyId)) {
          console.log("Using numeric ID lookup for:", companyId);
          const numericId = parseInt(companyId, 10);
          
          const { data: companyByNumeric, error: numericError } = await supabase
            .rpc('get_company_by_numeric_id', { p_numeric_id: numericId });
            
          if (numericError) {
            console.error("Error finding company by numeric ID:", numericError);
            throw numericError;
          }
          
          if (companyByNumeric && companyByNumeric.length > 0) {
            console.log("Found company via numeric ID:", companyByNumeric[0]);
            
            // Get the full company data including sections
            const { data: fullCompany, error: fullError } = await supabase
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
                  score,
                  description,
                  created_at,
                  updated_at
                )
              `)
              .eq("id", companyByNumeric[0].id)
              .single();
              
            if (fullError) throw fullError;
            
            return transformCompanyData(fullCompany);
          }
        }
        
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
              score,
              description,
              created_at,
              updated_at
            )
          `)
          .eq("id", companyId)
          .maybeSingle();

        if (error) throw error;
        
        if (!companyData) {
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
function transformCompanyData(companyData: any) {
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
      description: section.description || "",
      createdAt: section.created_at,
      updatedAt: section.updated_at || section.created_at
    })),
    createdAt: companyData.created_at,
    updatedAt: companyData.updated_at
  };
}
