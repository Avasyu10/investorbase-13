
import { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { downloadReport } from "@/lib/supabase";

// Image cache for rendered PDF pages
const imageCache = new Map<string, string>();

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
  const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);
  
  // Generate a unique cache key for this page
  const cacheKey = `${pdfUrl}-page-${segment.pageIndex}`;
  
  useEffect(() => {
    if (canvasRef.current) {
      setIsCanvasMounted(true);
    }
  }, []);

  useEffect(() => {
    // Check if we already have this page cached
    if (imageCache.has(cacheKey)) {
      setCachedImageUrl(imageCache.get(cacheKey) || null);
      setIsRenderingCanvas(false);
      return;
    }
    
    if (!isCanvasMounted || segment.pageIndex === undefined || renderAttempted) return;

    const renderPagePreview = async () => {
      try {
        setIsRenderingCanvas(true);
        setRenderAttempted(true);
        
        const pdf = pdfBlob || await downloadReport(pdfUrl);
        
        if (!canvasRef.current) return;
        
        await renderPdfPageToCanvas(pdf, segment.pageIndex, canvasRef.current, 1);
        
        // Cache the rendered canvas as an image
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        imageCache.set(cacheKey, dataUrl);
        setCachedImageUrl(dataUrl);
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
  }, [segment, pdfUrl, isCanvasMounted, pdfBlob, renderAttempted, cacheKey]);

  return (
    <div className="w-full">
      {isRenderingCanvas && (
        <div className="flex justify-center items-center py-8">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {cachedImageUrl ? (
        <img 
          src={cachedImageUrl} 
          alt="Detailed Report" 
          className={`w-full h-auto ${isRenderingCanvas ? 'hidden' : 'block'}`}
        />
      ) : (
        <canvas 
          ref={canvasRef} 
          className={`w-full h-auto ${isRenderingCanvas ? 'hidden' : 'block'}`}
        />
      )}
    </div>
  );
}
