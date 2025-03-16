
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Loader, Calendar, FileText, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  useEffect(() => {
    const loadPdf = async () => {
      if (!report?.pdf_url) return;
      
      try {
        setLoadingPdf(true);
        // Download the PDF file
        const blob = await downloadReport(report.pdf_url, report.user_id);
        setPdfBlob(blob);
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
        console.log("PDF loaded successfully:", url);
      } catch (error) {
        console.error("Error loading PDF:", error);
        toast({
          title: "Failed to load PDF",
          description: "There was an error loading the document. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoadingPdf(false);
      }
    };
    
    if (report && !pdfBlob && !loadingPdf) {
      loadPdf();
    }
    
    // Cleanup function
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [report, pdfBlob, toast, loadingPdf]);

  const handleDownload = async () => {
    if (!report) return;
    
    try {
      const blob = pdfBlob || await downloadReport(report.pdf_url, report.user_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `${report.title}.pdf is downloading`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the report",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <p className="text-destructive font-medium text-xl">Failed to load report</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "There was an error loading this report. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleDownload} 
            className="transition-all duration-200 hover:shadow-md"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
      
      {report.description && (
        <p className="text-muted-foreground">{report.description}</p>
      )}
      
      {/* PDF Viewer */}
      <div className="w-full bg-card border rounded-lg overflow-hidden shadow-sm">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-[80vh] border-0"
            title={`${report.title} PDF`}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex justify-center items-center h-[80vh]">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
