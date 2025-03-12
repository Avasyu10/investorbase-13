import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Loader, Calendar, FileText, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportSegment } from "./ReportSegment";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  useEffect(() => {
    const loadPdf = async () => {
      if (!report?.pdf_url) return;
      
      try {
        setIsLoadingPdf(true);
        const blob = await downloadReport(report.pdf_url);
        setPdfBlob(blob);
      } catch (error) {
        console.error("Error loading PDF:", error);
      } finally {
        setIsLoadingPdf(false);
      }
    };
    
    if (report && !pdfBlob) {
      loadPdf();
    }
  }, [report, pdfBlob]);

  const handleDownload = async () => {
    if (!report) return;
    
    try {
      const blob = pdfBlob || await downloadReport(report.pdf_url);
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
          <p className="text-destructive font-medium">Failed to load report</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "There was an error loading this report. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  const reportSegments = report.parsedSegments || [];

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
      
      <p className="text-muted-foreground">{report.description}</p>
      
      <Separator className="my-6" />
      
      <div className="mb-4 flex items-center">
        <FileIcon className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Report</h2>
      </div>
      
      {isLoadingPdf && (
        <div className="text-center py-4">
          <Loader className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading PDF for preview...</p>
        </div>
      )}
      
      {reportSegments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportSegments.map((segment, index) => (
            <ReportSegment 
              key={segment.id} 
              segment={segment} 
              reportId={reportId}
              pdfUrl={report.pdf_url}
              pdfBlob={pdfBlob || undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No pages could be extracted from this PDF. Please download the full report.</p>
        </div>
      )}
    </div>
  );
}
