
import { useEffect, useRef, useState } from "react";
import { renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";

interface PDFPreviewProps {
  pdfUrl: string;
  pageIndex: number;
  scale?: number;
}

export function PDFPreview({ pdfUrl, pageIndex, scale = 0.3 }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    const renderPreview = async () => {
      if (!canvasRef.current || !inView) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        await renderPdfPageToCanvas(blob, pageIndex, canvasRef.current, scale);
      } catch (error) {
        console.error('Error rendering PDF preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (inView) {
      renderPreview();
    }
  }, [pdfUrl, pageIndex, scale, inView]);

  return (
    <div ref={ref} className="w-full aspect-[1/1.4] relative">
      {isLoading && (
        <Skeleton className="w-full h-full absolute inset-0" />
      )}
      <canvas 
        ref={canvasRef}
        className={`w-full h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
    </div>
  );
}
