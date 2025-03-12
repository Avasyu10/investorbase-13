
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader } from "lucide-react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { downloadReport } from "@/lib/supabase";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
  pdfUrl: string;
}

export function ReportSegment({ segment, reportId, pdfUrl }: ReportSegmentProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(true);

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

  // Display the title (page number)
  const displayTitle = segment.title || "Untitled Section";

  useEffect(() => {
    const renderPagePreview = async () => {
      if (!canvasRef.current || !pdfUrl || segment.pageIndex === undefined) return;

      try {
        setIsRenderingCanvas(true);
        // Get the PDF blob
        const pdfBlob = await downloadReport(pdfUrl);
        
        // Render the page to the canvas at a scaled down size for preview
        await renderPdfPageToCanvas(pdfBlob, segment.pageIndex, canvasRef.current, 0.5);
      } catch (error) {
        console.error('Error rendering PDF page preview:', error);
      } finally {
        setIsRenderingCanvas(false);
      }
    };
    
    renderPagePreview();
  }, [segment, pdfUrl]);

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md cursor-pointer hover:border-primary/50"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg group flex items-center justify-between">
          <span>{displayTitle}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 group-hover:text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[150px] relative border rounded overflow-hidden">
          {isRenderingCanvas && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full object-contain ${isRenderingCanvas ? 'opacity-0' : 'opacity-100'}`}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Page {segment.pageNumbers?.join(', ')}
        </div>
      </CardContent>
    </Card>
  );
}
