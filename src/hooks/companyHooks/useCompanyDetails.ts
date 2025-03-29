import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDetailed } from "@/types/company";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function useCompanyDetails(companyId: string | undefined) {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchCompanyDetails() {
      try {
        setLoading(true);
        setError(null);

        // First, get the company record
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select(`
            *,
            reports (
              id,
              title,
              description,
              pdf_url,
              created_at,
              submitter_email
            ),
            sections (
              id,
              title,
              type,
              score,
              description,
              section_type,
              section_details (
                id,
                detail_type,
                content
              )
            )
          `)
          .eq("id", companyId)
          .single();

        if (companyError) {
          throw companyError;
        }

        if (!companyData) {
          throw new Error("Company not found");
        }

        // Check if the user has access to this company
        if (user && companyData.user_id !== user.id) {
          const { data: accessData, error: accessError } = await supabase
            .from("company_access")
            .select("*")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (accessError) {
            console.error("Error checking company access:", accessError);
          }

          if (!accessData) {
            // Check if the company is from a public submission
            if (companyData.source !== "public_url") {
              throw new Error("You don't have access to this company");
            }
          }
        }

        // Process sections to group by type
        const sectionsByType: Record<string, any[]> = {};
        
        if (companyData.sections) {
          companyData.sections.forEach((section) => {
            const type = section.section_type || section.type;
            if (!sectionsByType[type]) {
              sectionsByType[type] = [];
            }
            
            // Process section details
            const strengths = section.section_details
              ? section.section_details
                  .filter((detail) => detail.detail_type === "strength")
                  .map((detail) => detail.content)
              : [];
              
            const weaknesses = section.section_details
              ? section.section_details
                  .filter((detail) => detail.detail_type === "weakness")
                  .map((detail) => detail.content)
              : [];
            
            sectionsByType[type].push({
              ...section,
              strengths,
              weaknesses,
            });
          });
        }

        // Format the data for the UI
        const formattedCompany: CompanyDetailed = {
          ...companyData,
          sectionsByType,
        };

        setCompany(formattedCompany);
      } catch (err: any) {
        console.error("Error fetching company details:", err);
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyDetails();
  }, [companyId, toast, user]);

  return { company, loading, error };
}
