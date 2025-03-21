
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionDetailed } from "@/hooks/useCompanyDetails";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useSectionDetails(sectionId?: string) {
  const [section, setSection] = useState<SectionDetailed | null>(null);

  const { isLoading, error, data } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: async () => {
      if (!sectionId) throw new Error("Section ID is required");

      try {
        console.log("Fetching section details for ID:", sectionId);
        
        const { data: sectionData, error } = await supabase
          .from("sections")
          .select(`
            id,
            title,
            type,
            score,
            description,
            created_at,
            updated_at,
            company_id,
            section_type,
            section_details (
              id,
              content,
              detail_type,
              created_at
            )
          `)
          .eq("id", sectionId)
          .maybeSingle();

        if (error) throw error;
        if (!sectionData) throw new Error("Section not found");

        console.log("Section data:", sectionData);

        // Separate section details by type
        const strengths = sectionData.section_details
          .filter((detail: any) => detail.detail_type === "strength")
          .map((detail: any) => ({
            id: detail.id,
            content: detail.content,
          }));

        const weaknesses = sectionData.section_details
          .filter((detail: any) => detail.detail_type === "weakness")
          .map((detail: any) => ({
            id: detail.id,
            content: detail.content,
          }));

        // Convert string type to expected SectionType enum value
        const sectionType = sectionData.type as "team" | "product" | "market" | "business" | "financials" | "competition" | "other";
        
        // Build formatted section
        const formattedSection: SectionDetailed = {
          id: sectionData.id,
          title: sectionData.title,
          type: sectionType,
          score: Number(sectionData.score),
          description: sectionData.description || "",
          // Some sections might have detailed_content in different formats
          detailedContent: sectionData.section_type || "",
          strengths,
          weaknesses,
          createdAt: sectionData.created_at,
          updatedAt: sectionData.updated_at
        };

        return formattedSection;
      } catch (err) {
        console.error("Error in useSectionDetails:", err);
        throw err;
      }
    },
    enabled: !!sectionId,
    meta: {
      onError: (error: Error) => {
        console.error("Error fetching section details:", error);
        toast({
          title: "Error loading section details",
          description: error.message || "Could not load section details",
          variant: "destructive",
        });
      }
    }
  });

  // Process returned data
  if (data && !section) {
    setSection(data);
  }

  return {
    section,
    isLoading,
    error,
  };
}
