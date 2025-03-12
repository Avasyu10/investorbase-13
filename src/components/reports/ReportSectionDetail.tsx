
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Loader, Calendar, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";

interface ReportSectionDetailProps {
  reportId: string;
  sectionId: string;
}

export function ReportSectionDetail({ reportId, sectionId }: ReportSectionDetailProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

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

  useEffect(() => {
    const renderPdfPage = async () => {
      if (!report || !canvasRef.current) return;
      
      const section = report.parsedSegments?.find(segment => segment.id === sectionId);
      if (!section || section.pageIndex === undefined) return;
      
      try {
        // Get the PDF blob
        const pdfBlob = await downloadReport(report.pdf_url);
        
        // Render the page to the canvas at full size
        await renderPdfPageToCanvas(pdfBlob, section.pageIndex, canvasRef.current, 1.5);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      }
    };
    
    if (report) {
      renderPdfPage();
    }
  }, [report, sectionId, reportId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading section...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load report section</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "There was an error loading this report section. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  const section = report.parsedSegments?.find(segment => segment.id === sectionId);

  if (!section) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Section not found</p>
          <p className="text-sm text-muted-foreground">
            The requested section could not be found in this report.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/reports/${reportId}`)}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to report
          </Button>
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
            variant="outline" 
            onClick={() => navigate(`/reports/${reportId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to report
          </Button>
          <Button 
            onClick={handleDownload} 
            className="transition-all duration-200 hover:shadow-md"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.pageNumbers && section.pageNumbers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Page{section.pageNumbers.length > 1 ? 's' : ''}: {section.pageNumbers.join(', ')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex justify-center w-full overflow-auto">
            <div className="max-w-full border rounded shadow-lg overflow-auto">
              <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
