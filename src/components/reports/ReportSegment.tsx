
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment, renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import { downloadReport } from "@/lib/supabase";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
}

export function ReportSegment({ segment, reportId }: ReportSegmentProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const renderPage = async () => {
      if (!canvasRef.current || segment.pageIndex === undefined) return;
      
      try {
        // Get the PDF blob
        const pdfBlob = await downloadReport(reportId);
        
        // Render the page to the canvas
        await renderPdfPageToCanvas(pdfBlob, segment.pageIndex, canvasRef.current, 0.5); // Scale down to 50%
      } catch (error) {
        console.error('Error rendering PDF page preview:', error);
      }
    };
    
    renderPage();
  }, [segment, reportId]);

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md h-full cursor-pointer hover:border-primary/50"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg group flex items-center justify-between">
          <span>{segment.title}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 group-hover:text-primary" />
        </CardTitle>
        {segment.pageNumbers && segment.pageNumbers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Page{segment.pageNumbers.length > 1 ? 's' : ''}: {segment.pageNumbers.join(', ')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center overflow-hidden">
          <div className="relative w-full border rounded shadow-sm max-h-[280px] overflow-hidden">
            {segment.pageIndex !== undefined ? (
              <canvas 
                ref={canvasRef} 
                className="w-full h-auto object-contain" 
              />
            ) : (
              <div className="flex items-center justify-center h-48 bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
