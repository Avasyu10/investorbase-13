
import { useEffect, useRef, useState } from "react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { AlertCircle } from "lucide-react";

interface PDFPreviewProps {
  pdfUrl: string;
  pageIndex: number;
  scale?: number;
}

export function PDFPreview({ pdfUrl, pageIndex, scale = 0.3 }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const renderPreview = async () => {
      if (!canvasRef.current || !inView) return;
      
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Use AbortController for the fetch to prevent memory leaks
        const response = await fetch(pdfUrl, { 
          signal: controller.signal,
          // Add cache control headers
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Only continue if component is still mounted
        if (isMounted && canvasRef.current) {
          await renderPdfPageToCanvas(blob, pageIndex, canvasRef.current, scale);
        }
      } catch (error) {
        console.error('Error rendering PDF preview:', error);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (inView) {
      renderPreview();
    }

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pdfUrl, pageIndex, scale, inView]);

  return (
    <div ref={ref} className="w-full aspect-[1/1.4] relative">
      {isLoading && (
        <Skeleton className="w-full h-full absolute inset-0" />
      )}
      
      {hasError && (
        <div className="w-full h-full flex items-center justify-center bg-muted/20 absolute inset-0">
          <div className="flex flex-col items-center text-muted-foreground p-4">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-xs text-center">Preview unavailable</p>
          </div>
        </div>
      )}
      
      <canvas 
        ref={canvasRef}
        className={`w-full h-full object-contain ${isLoading || hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
    </div>
  );
}
