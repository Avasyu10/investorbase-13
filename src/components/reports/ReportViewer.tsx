
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Loader, Calendar, FileText, Download, AlertCircle } from "lucide-react";
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
  
  const { data: report, isLoading, error } = useQuery({
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
        
        let attemptsRemaining = 3;
        let blob = null;
        
        while (attemptsRemaining > 0 && !blob) {
          try {
            // If we're on the last attempt and this is an email submission, try direct storage access
            if (attemptsRemaining === 1 && isEmailSubmission) {
              console.log("Final attempt: trying direct email attachment download");
              
              // Check for email submission details
              const { data: emailData } = await supabase
                .from('email_submissions')
                .select('attachment_url')
                .eq('report_id', reportId)
                .single();
              
              if (emailData?.attachment_url) {
                console.log("Found attachment URL:", emailData.attachment_url);
                
                // Direct access via storage API
                const { data: fileData, error: storageError } = await supabase.storage
                  .from('email_attachments')
                  .download(emailData.attachment_url);
                
                if (storageError) {
                  throw storageError;
                }
                
                if (fileData) {
                  blob = fileData;
                  break;
                }
              }
            } else {
              // Use standard download path with appropriate fallbacks
              blob = await downloadReport(report.pdf_url, user.id);
              
              if (blob) {
                console.log("Successfully downloaded PDF");
                break;
              }
            }
          } catch (downloadError) {
            console.error(`Download attempt ${4-attemptsRemaining} failed:`, downloadError);
            attemptsRemaining--;
            
            if (attemptsRemaining === 0) {
              throw downloadError;
            }
            
            // Wait briefly before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!blob) {
          throw new Error("Could not download PDF after multiple attempts");
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
