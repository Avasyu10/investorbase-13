
import { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { downloadReport } from "@/lib/supabase";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  pdfUrl: string;
  pdfBlob?: Blob;
}

export function ReportSegment({ segment, pdfUrl, pdfBlob }: ReportSegmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(true);
  const [isCanvasMounted, setIsCanvasMounted] = useState(false);
  const [renderAttempted, setRenderAttempted] = useState(false);
  
  useEffect(() => {
    if (canvasRef.current) {
      setIsCanvasMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!isCanvasMounted || segment.pageIndex === undefined || renderAttempted) return;

    const renderPagePreview = async () => {
      try {
        setIsRenderingCanvas(true);
        setRenderAttempted(true);
        
        const pdf = pdfBlob || await downloadReport(pdfUrl);
        
        if (!canvasRef.current) return;
        
        await renderPdfPageToCanvas(pdf, segment.pageIndex, canvasRef.current, 1);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
      } finally {
        setIsRenderingCanvas(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      renderPagePreview();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [segment, pdfUrl, isCanvasMounted, pdfBlob, renderAttempted]);

  return (
    <div className="w-full">
      {isRenderingCanvas && (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className={`w-full h-auto ${isRenderingCanvas ? 'hidden' : 'block'}`}
      />
    </div>
  );
}
