import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function useCsvDownload() {
  const { user } = useAuth();

  const downloadEurekaDataAsCsv = async (filename: string = "eureka-data.csv") => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Call the edge function which returns CSV text
      const { data, error } = await supabase.functions.invoke("export-eureka-csv", {
        body: { request: "eureka-csv" },
      });

      if (error) throw error;

      const csvContent: string = typeof data === "string" ? data : (data?.csv as string);
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error("No data returned from backend");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return csvContent.split("\n").length - 1; // rows count excluding header
    } catch (err: any) {
      console.error("CSV download failed:", err);
      // Surface toast here in case caller didn't
      try {
        toast({ title: "Download Failed", description: err.message || "Failed to fetch" , variant: "destructive"});
      } catch {}
      throw err;
    }
  };

  return { downloadEurekaDataAsCsv };
}
