
import { useState, useEffect } from "react";
import { ReportCard } from "./ReportCard";
import { useNavigate } from "react-router-dom";
import { getReports, Report } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FileText, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function ReportsList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [archivedReports, setArchivedReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch reports on component mount
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

        // Get archived reports from localStorage if available
        const savedArchivedIds = localStorage.getItem('archivedReports');
        const archivedIds = savedArchivedIds ? JSON.parse(savedArchivedIds) : [];
        
        // Filter reports into active and archived
        const active = fetchedReports.filter(report => !archivedIds.includes(report.id));
        const archived = fetchedReports.filter(report => archivedIds.includes(report.id));
        
        setReports(active);
        setArchivedReports(archived);
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

  // If user is not logged in, show authentication required message
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

  // Group reports by source
  const publicSubmissions = reports.filter(report => report.is_public_submission);
  const dashboardReports = reports.filter(report => !report.is_public_submission);

  // Handler for selecting/deselecting reports
  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Handler for archiving selected reports
  const handleArchiveSelected = () => {
    // Find the reports to archive
    const reportsToArchive = reports.filter(report => selectedReports.includes(report.id));
    
    if (reportsToArchive.length === 0) return;
    
    // Update the reports state
    setReports(prev => prev.filter(report => !selectedReports.includes(report.id)));
    setArchivedReports(prev => [...prev, ...reportsToArchive]);
    
    // Save to localStorage
    const currentArchivedIds = archivedReports.map(report => report.id);
    const newArchivedIds = [...currentArchivedIds, ...reportsToArchive.map(report => report.id)];
    localStorage.setItem('archivedReports', JSON.stringify(newArchivedIds));
    
    // Clear selection and show toast
    setSelectedReports([]);
    toast({
      title: `${reportsToArchive.length} report(s) archived`,
      description: "Items have been moved to the Archive folder"
    });
  };

  // Handler for folder selection
  const handleFolderChange = (folderName: string) => {
    setActiveFolder(folderName);
    setSelectedReports([]);
  };

  // Determine which reports to display based on active folder
  const getDisplayReports = () => {
    switch (activeFolder) {
      case "public":
        return publicSubmissions;
      case "dashboard":
        return dashboardReports;
      case "archive":
        return archivedReports;
      default:
        return reports;
    }
  };

  const displayReports = getDisplayReports();
  const hasSelection = selectedReports.length > 0;
  const canArchive = activeFolder !== "archive" && hasSelection;

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

      {/* Folder Navigation */}
      <div className="flex space-x-2 mb-6">
        <Button 
          variant={activeFolder === "all" ? "default" : "outline"} 
          onClick={() => handleFolderChange("all")}
          className="text-sm"
        >
          All
        </Button>
        <Button 
          variant={activeFolder === "public" ? "default" : "outline"} 
          onClick={() => handleFolderChange("public")}
          className="text-sm"
        >
          Public Submissions ({publicSubmissions.length})
        </Button>
        <Button 
          variant={activeFolder === "dashboard" ? "default" : "outline"} 
          onClick={() => handleFolderChange("dashboard")}
          className="text-sm"
        >
          Dashboard ({dashboardReports.length})
        </Button>
        <Button 
          variant={activeFolder === "archive" ? "default" : "outline"} 
          onClick={() => handleFolderChange("archive")}
          className="text-sm"
        >
          Archives ({archivedReports.length})
        </Button>
      </div>

      {/* Action Bar */}
      {(activeFolder === "public" || activeFolder === "dashboard" || activeFolder === "all") && (
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {selectedReports.length > 0 ? (
              <span>{selectedReports.length} item(s) selected</span>
            ) : (
              <span>Select items to archive</span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleArchiveSelected}
            disabled={!canArchive}
            className={`${!canArchive ? 'opacity-50' : ''}`}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Selected
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : displayReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayReports.map((report) => (
            <ReportCard 
              key={report.id} 
              report={report} 
              isSelectable={activeFolder !== "archive"}
              isSelected={selectedReports.includes(report.id)}
              onSelect={() => handleSelectReport(report.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No reports found</h3>
          <p className="mt-2 text-muted-foreground">
            {activeFolder === "archive" 
              ? "Archived items will appear here" 
              : "Upload your first pitch deck to get started"}
          </p>
          {activeFolder !== "archive" && (
            <Button 
              onClick={() => navigate("/upload")} 
              className="mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Upload Your First Deck
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
