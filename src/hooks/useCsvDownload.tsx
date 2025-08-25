import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CsvData {
  ideaId: string;
  eurekaId: string;
  score: number | "";
}

export function useCsvDownload() {
  const { user } = useAuth();

  const downloadEurekaDataAsCsv = async (filename: string = "eureka-data.csv") => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Fetch ALL Eureka submissions in batches, then join with companies for scores
      let allData: CsvData[] = [];
      let start = 0;
      const batchSize = 1000; // safe batch size for large datasets
      let hasMore = true;

      while (hasMore) {
        const { data: submissions, error: subErr } = await supabase
          .from("eureka_form_submissions")
          .select("company_id, idea_id, eureka_id")
          .order("created_at", { ascending: false })
          .range(start, start + batchSize - 1);

        if (subErr) throw subErr;
        if (!submissions || submissions.length === 0) {
          break;
        }

        const companyIds = submissions
          .map((s) => s.company_id)
          .filter((id): id is string => Boolean(id));

        let scoresByCompany: Record<string, number> = {};
        if (companyIds.length > 0) {
          const { data: companies, error: compErr } = await supabase
            .from("companies")
            .select("id, overall_score")
            .in("id", companyIds);

          if (compErr) throw compErr;
          (companies || []).forEach((c) => {
            // Normalize numeric score
            const score = typeof c.overall_score === "number" ? Math.round(c.overall_score) : 0;
            scoresByCompany[c.id] = score;
          });
        }

        const batchData: CsvData[] = submissions.map((s) => ({
          ideaId: s.idea_id || "",
          eurekaId: s.eureka_id || "",
          score: scoresByCompany[s.company_id as string] ?? "",
        }));

        allData = allData.concat(batchData);

        start += batchSize;
        hasMore = submissions.length === batchSize;
      }

      // Generate CSV content (only 3 columns as requested)
      const headers = ["Idea ID", "Eureka ID", "Score"];
      const csvRows = [headers.join(",")];

      for (const row of allData) {
        // Escape any commas/quotes in fields
        const safe = (val: string | number | "") => {
          const str = String(val ?? "");
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };
        csvRows.push([safe(row.ideaId), safe(row.eurekaId), safe(row.score)].join(","));
      }

      const csvContent = csvRows.join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return allData.length;
    } catch (error) {
      console.error("Error downloading CSV:", error);
      throw error;
    }
  };

  return { downloadEurekaDataAsCsv };
}
