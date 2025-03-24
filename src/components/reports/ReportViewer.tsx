
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Loader, Calendar, FileText, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [downloadAttempts, setDownloadAttempts] = useState(0);
  const [isEmailSubmission, setIsEmailSubmission] = useState(false);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId, user?.id],
    queryFn: () => getReportById(reportId),
    enabled: !!reportId && !!user,
    retry: 1,
    meta: {
      onError: (err: any) => {
        console.error("Error fetching report:", err);
        toast({
          title: "Error loading report",
          description: err.message || "Failed to load report data",
          variant: "destructive",
        });
      },
    },
  });

  // Determine if this is an email submission based on the PDF path
  useEffect(() => {
    if (report?.pdf_url) {
      setIsEmailSubmission(report.pdf_url.includes('email_attachments/'));
      console.log(`Report PDF URL: ${report.pdf_url} - Is email submission: ${report.pdf_url.includes('email_attachments/')}`);
    }
  }, [report]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId, pdfUrl]);

  useEffect(() => {
    const loadPdf = async () => {
      if (!report?.pdf_url || !user?.id) return;
      
      try {
        setLoadingPdf(true);
        console.log("Loading PDF for report:", report.title);
        console.log(`PDF URL path: ${report.pdf_url}`);
        
        if (isEmailSubmission) {
          console.log("Downloading email attachment PDF");
        }
        
        const blob = await downloadReport(report.pdf_url, user.id);
        if (!blob) {
          throw new Error("Could not download PDF");
        }
        
        setPdfBlob(blob);
        
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
        console.log("PDF loaded successfully:", url);
      } catch (error) {
        console.error("Error loading PDF:", error);
        
        // Try again with a slightly modified path for email attachments
        if (isEmailSubmission && downloadAttempts < 2) {
          setDownloadAttempts(prev => prev + 1);
          toast({
            title: "Retrying PDF download",
            description: "Having trouble loading the email attachment, retrying...",
          });
          return; // Will trigger another attempt through the effect dependency
        }
        
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
  }, [report, pdfBlob, toast, loadingPdf, user, isEmailSubmission, downloadAttempts]);

  const handleDownload = async () => {
    if (!report || !user) return;
    
    try {
      let blob = pdfBlob;
      
      if (!blob) {
        blob = await downloadReport(report.pdf_url, user.id);
      }
      
      if (!blob) {
        throw new Error("Could not download PDF");
      }
      
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight">{report.title}</h2>
            {report.is_public_submission ? (
              <Badge variant="green" className="ml-2">
                Public
              </Badge>
            ) : (
              <Badge variant="gold" className="ml-2">
                Dashboard
              </Badge>
            )}
            {isEmailSubmission && (
              <Badge variant="blue" className="ml-2">
                Email
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>
        <div>
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
      
      <div className="w-full bg-card border rounded-lg overflow-hidden shadow-sm">
        {pdfUrl ? (
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-[70vh]"
          >
            <p>It appears your browser doesn't support embedded PDFs. You can 
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"> download the PDF</a> instead.
            </p>
          </object>
        ) : (
          <div className="flex justify-center items-center h-[70vh]">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-3">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF document...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">Failed to load PDF</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
