
import { useQuery } from "@tanstack/react-query";
import { ReportCard } from "./ReportCard";
import { getReports } from "@/lib/supabase";
import { Loader } from "lucide-react";

export function ReportsList() {
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load reports</p>
          <p className="text-sm text-muted-foreground">
            There was an error loading your reports. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <p className="font-medium">No reports found</p>
          <p className="text-sm text-muted-foreground">
            There are currently no reports available in your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}
