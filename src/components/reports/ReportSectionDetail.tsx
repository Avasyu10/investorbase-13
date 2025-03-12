
import { useQuery } from "@tanstack/react-query";
import { getReportById, downloadReport } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader, Calendar, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";

interface ReportSectionDetailProps {
  reportId: string;
  sectionId: string;
}

export function ReportSectionDetail({ reportId, sectionId }: ReportSectionDetailProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => getReportById(reportId),
  });

  // Preload the PDF
  useEffect(() => {
    const loadPdf = async () => {
      if (!report?.pdf_url) return;
      
      try {
        const blob = await downloadReport(report.pdf_url);
        setPdfBlob(blob);
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
    };
    
    if (report && !pdfBlob) {
      loadPdf();
    }
  }, [report, pdfBlob]);

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
        setIsRenderingCanvas(true);
        // Use cached blob if available
        const pdf = pdfBlob || await downloadReport(report.pdf_url);
        
        // Render the page to the canvas at a slightly larger scale for detail view
        await renderPdfPageToCanvas(pdf, section.pageIndex, canvasRef.current, 1.5);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      } finally {
        setIsRenderingCanvas(false);
      }
    };
    
    // Only render when PDF blob is available or we have report data
    if ((report && pdfBlob) || (report && !pdfBlob)) {
      // Add a small delay to ensure the canvas is ready
      const timeoutId = setTimeout(() => {
        renderPdfPage();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [report, sectionId, reportId, pdfBlob]);

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
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center w-full overflow-auto">
            <div className="max-w-full border rounded shadow-lg overflow-auto">
              {isRenderingCanvas && (
                <div className="p-8 flex flex-col items-center justify-center">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Rendering page...</p>
                </div>
              )}
              <canvas 
                ref={canvasRef} 
                className={`max-w-full h-auto ${isRenderingCanvas ? 'hidden' : 'block'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
