
import { useState, useEffect } from "react";
import { ReportCard } from "./ReportCard";
import { useNavigate } from "react-router-dom";
import { getReports, Report } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchReports() {
      try {
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please sign in to view reports",
            variant: "destructive",
          });
          setReports([]);
          setIsLoading(false);
          return;
        }
        
        setIsLoading(true);
        const fetchedReports = await getReports();
        setReports(fetchedReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Failed to load reports",
          description: "Please try again later or contact support",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchReports();
  }, [toast, user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Authentication Required</h3>
          <p className="mt-2 text-muted-foreground">
            Please sign in to view your reports
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="mt-6"
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Pitch Decks</h1>
          <p className="text-muted-foreground">
            Access your Pitch Decks for analysis and review
          </p>
        </div>
        <Button 
          onClick={() => navigate("/upload")} 
          className="mt-4 sm:mt-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload New Deck
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No reports found</h3>
          <p className="mt-2 text-muted-foreground">
            Upload your first pitch deck to get started
          </p>
          <Button 
            onClick={() => navigate("/upload")} 
            className="mt-6"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload Your First Deck
          </Button>
        </div>
      )}
    </div>
  );
}
