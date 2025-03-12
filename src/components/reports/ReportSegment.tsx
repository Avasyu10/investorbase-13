
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader } from "lucide-react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { downloadReport } from "@/lib/supabase";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
  pdfUrl: string;
  pdfBlob?: Blob;
}

export function ReportSegment({ segment, reportId, pdfUrl, pdfBlob }: ReportSegmentProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(true);
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);
  const [renderAttempted, setRenderAttempted] = useState(false);

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };
  
  // Set canvas as mounted after initial render
  useEffect(() => {
    if (canvasRef.current) {
      setIsCanvasMounted(true);
    }
  }, []);

  useEffect(() => {
    // Only attempt to render when canvas is mounted and we have all required data
    // Also check if we've already attempted a render to avoid infinite loops
    if (!isCanvasMounted || segment.pageIndex === undefined || renderAttempted) return;

    const renderPagePreview = async () => {
      try {
        setIsRenderingCanvas(true);
        setRenderAttempted(true);
        
        // Use the provided pdfBlob if available, otherwise download it
        const pdf = pdfBlob || await downloadReport(pdfUrl);
        
        // Check again if canvas is still valid
        if (!canvasRef.current) return;
        
        // Render at a lower scale for better performance
        await renderPdfPageToCanvas(pdf, segment.pageIndex, canvasRef.current, 0.3);
      } catch (error) {
        console.error('Error rendering PDF page preview:', error);
      } finally {
        setIsRenderingCanvas(false);
      }
    };
    
    // Use a small delay to ensure the canvas is ready in the DOM
    const timeoutId = setTimeout(() => {
      renderPagePreview();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [segment, pdfUrl, isCanvasMounted, pdfBlob, renderAttempted]);

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md cursor-pointer hover:border-primary/50"
      onClick={handleClick}
    >
      <CardContent className="pt-4">
        <div className="w-full h-[250px] relative border rounded overflow-hidden bg-muted/20">
          {isRenderingCanvas && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            className={`w-full h-full object-contain ${isRenderingCanvas ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
