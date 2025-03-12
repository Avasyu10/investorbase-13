
import { useEffect, useRef, useState } from "react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

interface PDFPreviewProps {
  pdfUrl: string;
  pageIndex: number;
  scale?: number;
}

export function PDFPreview({ pdfUrl, pageIndex, scale = 0.3 }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const renderPreview = async () => {
      if (!canvasRef.current) return;
      
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Simulate a small delay to prevent rapid re-rendering attempts
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (!isMounted) return;
        
        // Use AbortController for the fetch to prevent memory leaks
        const response = await fetch(pdfUrl, { 
          signal: controller.signal,
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

    renderPreview();

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [pdfUrl, pageIndex, scale]);

  return (
    <div className="w-full aspect-[1/1.4] relative bg-muted/10">
      {isLoading && (
        <Skeleton className="w-full h-full absolute inset-0" />
      )}
      
      {hasError && (
        <div className="w-full h-full flex items-center justify-center absolute inset-0">
          <div className="flex flex-col items-center text-muted-foreground p-4">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
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
