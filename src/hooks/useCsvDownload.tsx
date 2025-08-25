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
      console.log("Starting CSV download...");
      let allData: CsvData[] = [];
      let start = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching eureka submissions batch starting at ${start}...`);
        
        // Get eureka submissions that have company_id (filter out nulls)
        const { data: submissions, error: subErr } = await supabase
          .from("eureka_form_submissions")
          .select("company_id, idea_id, eureka_id")
          .not("company_id", "is", null)
          .order("created_at", { ascending: false })
          .range(start, start + batchSize - 1);

        if (subErr) {
          console.error("Error fetching eureka submissions:", subErr);
          throw subErr;
        }

        if (!submissions || submissions.length === 0) {
          console.log("No more submissions found");
          break;
        }

        console.log(`Found ${submissions.length} submissions with company IDs`);

        // Get company scores for these submissions
        const companyIds = submissions.map((s) => s.company_id).filter(Boolean);
        
        if (companyIds.length === 0) {
          console.log("No valid company IDs in this batch");
          start += batchSize;
          hasMore = submissions.length === batchSize;
          continue;
        }

        const { data: companies, error: compErr } = await supabase
          .from("companies")
          .select("id, overall_score")
          .in("id", companyIds);

        if (compErr) {
          console.error("Error fetching company scores:", compErr);
          throw compErr;
        }

        console.log(`Found scores for ${companies?.length || 0} companies`);

        // Create lookup map for scores
        const scoresByCompany: Record<string, number> = {};
        (companies || []).forEach((c) => {
          const score = typeof c.overall_score === "number" ? Math.round(c.overall_score) : 0;
          scoresByCompany[c.id] = score;
        });

        // Process this batch
        const batchData: CsvData[] = submissions
          .filter(s => s.company_id && scoresByCompany[s.company_id] !== undefined)
          .map((s) => ({
            ideaId: s.idea_id || "",
            eurekaId: s.eureka_id || "",
            score: scoresByCompany[s.company_id!],
          }));

        allData = allData.concat(batchData);
        console.log(`Processed batch: ${batchData.length} records, total so far: ${allData.length}`);

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
