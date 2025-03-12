
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Download, Loader, Calendar, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  useEffect(() => {
    if (report && !pdfUrl) {
      loadPdfPreview();
    }
  }, [report]);

  const loadPdfPreview = async () => {
    if (!report) return;
    
    try {
      setPreviewLoading(true);
      const blob = await downloadReport(report.pdf_url);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Clean up URL when component unmounts
      return () => {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      };
    } catch (error) {
      console.error("Preview loading error:", error);
      toast({
        title: "Preview failed",
        description: "There was an error loading the PDF preview",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    
    try {
      const blob = await downloadReport(report.pdf_url);
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
      
      {report.sections && report.sections.length > 0 ? (
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="preview" className="transition-all duration-200">
              <Eye className="mr-2 h-4 w-4" />
              PDF Preview
            </TabsTrigger>
            <TabsTrigger value="sections" className="transition-all duration-200">
              <FileText className="mr-2 h-4 w-4" />
              Sections
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="animate-fade-in">
            <Card className="mb-4">
              <CardContent className="pt-6">
                {previewLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-gray-200">
                    <iframe 
                      ref={iframeRef}
                      src={pdfUrl}
                      className="w-full h-full"
                      title={`${report.title} preview`}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-sm text-muted-foreground">
                      PDF preview could not be loaded. Try downloading the file instead.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sections" className="animate-fade-in">
            {report.sections.map((section) => (
              <Card key={section} className="mb-4">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{section}</h3>
                    <p className="text-sm text-muted-foreground">
                      This section preview would display content extracted from the PDF.
                      In a production environment, you would use a PDF parsing library to
                      extract and display the content of this section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {previewLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center space-y-2">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-gray-200">
                <iframe 
                  ref={iframeRef}
                  src={pdfUrl}
                  className="w-full h-full"
                  title={`${report.title} preview`}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                PDF preview could not be loaded. Try downloading the file instead.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
