import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDetailed } from "@/lib/api/apiContract";

interface UseCompanyDetailsResult {
  company: CompanyDetailed | null;
  isLoading: boolean;
  error: string | null;
}

export const useCompanyDetails = (id: string | undefined): UseCompanyDetailsResult => {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Company ID is required");
      setIsLoading(false);
      return;
    }

    const fetchCompanyDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (companyError) {
          console.error("Supabase error:", companyError);
          setError(companyError.message || "Failed to fetch company");
          return;
        }

        if (!companyData) {
          setError("Company not found");
          return;
        }

        // Make sure to only include properties that exist in CompanyDetailed type
        // and convert numeric IDs to strings where needed
        const company: CompanyDetailed = {
          id: id,
          name: companyData.name,
          overallScore: companyData.overall_score || 0,
          description: companyData.description || "",
          reportId: companyData.report_id || null,
          sections: companyData.sections || [],
          assessmentPoints: companyData.assessment_points || [],
          createdAt: companyData.created_at || new Date().toISOString(),
          updatedAt: companyData.updated_at || new Date().toISOString(),
          userId: companyData.user_id || "",
          active: companyData.active || false,
          stripePriceId: companyData.stripe_price_id || null,
          stripeProductId: companyData.stripe_product_id || null,
          perplexityResponse: companyData.perplexity_response || null,
          perplexityRequestedAt: companyData.perplexity_requested_at || null,
        };

        setCompany(company);
      } catch (err) {
        console.error("Error fetching company:", err);
        setError("Failed to fetch company");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [id]);

  return { company, isLoading, error };
};
