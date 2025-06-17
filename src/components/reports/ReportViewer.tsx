import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport, analyzeReport } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Loader, Calendar, FileText, Download, AlertCircle, ExternalLink, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [isEmailSubmission, setIsEmailSubmission] = useState(false);
  const [pdfDisplayError, setPdfDisplayError] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ["report", reportId, user?.id],
    queryFn: async () => {
      const reportData = await getReportById(reportId);
      
      // Check if this is an email submission
      const { data: emailSubmission } = await supabase
        .from('email_submissions')
        .select('attachment_url')
        .eq('report_id', reportId)
        .maybeSingle();
      
      if (emailSubmission?.attachment_url) {
        console.log("This is an email submission with attachment URL:", emailSubmission.attachment_url);
        setIsEmailSubmission(true);
      }
      
      return reportData;
    },
    enabled: !!reportId && !!user,
    retry: 2,
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

  const handleAnalyze = async () => {
    if (!report || !user) return;
    
    try {
      setAnalyzing(true);
      console.log("Starting analysis for report:", reportId);
      
      await analyzeReport(reportId);
      
      toast({
        title: "Analysis started",
        description: "Your report is being analyzed. This may take a few minutes.",
      });
      
      // Refetch the report to get updated analysis status
      setTimeout(() => {
        refetch();
      }, 2000);
      
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to start analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

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
        console.log("PDF URL:", report.pdf_url);
        console.log("Is email submission:", isEmailSubmission);
        
        let blob;
        try {
          blob = await downloadReport(report.pdf_url, user.id);
        } catch (downloadError) {
          console.error("Download error:", downloadError);
          toast({
            title: "Failed to load PDF",
            description: "There was an error loading the document. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        
        if (!blob) {
          throw new Error("Could not download PDF");
        }
        
        setPdfBlob(blob);
        
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
  }, [report, pdfBlob, toast, loadingPdf, user, reportId, isEmailSubmission]);

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

  const openInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handlePdfError = () => {
    console.log("PDF failed to load in embedded viewer");
    setPdfDisplayError(true);
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
            {report.analysis_status && (
              <Badge 
                variant={report.analysis_status === 'completed' ? 'green' : 
                        report.analysis_status === 'failed' ? 'destructive' : 'secondary'} 
                className="ml-2"
              >
                {report.analysis_status === 'completed' ? 'Analyzed' : 
                 report.analysis_status === 'failed' ? 'Analysis Failed' : 'Analyzing...'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {(!report.analysis_status || report.analysis_status === 'failed') && (
            <Button 
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="default"
              className="transition-all duration-200 hover:shadow-md"
            >
              {analyzing ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {analyzing ? "Analyzing..." : "Analyze PDF"}
            </Button>
          )}
          {pdfUrl && (
            <Button 
              onClick={openInNewTab} 
              variant="outline"
              className="transition-all duration-200 hover:shadow-md"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          )}
          <Button 
            onClick={handleDownload} 
            variant="outline"
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
          <>
            {!pdfDisplayError ? (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-[70vh]"
                onError={handlePdfError}
              >
                <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">PDF Viewer Not Supported</p>
                  <p className="text-muted-foreground mb-4">
                    Your browser doesn't support embedded PDF viewing.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={openInNewTab} variant="outline">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in New Tab
                    </Button>
                    <Button onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </object>
            ) : (
              <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">PDF Display Error</p>
                <p className="text-muted-foreground mb-4">
                  The PDF couldn't be displayed in the browser viewer.
                </p>
                <div className="flex gap-2">
                  <Button onClick={openInNewTab} variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </>
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
