
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment, renderPdfPageToCanvas } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader } from "lucide-react";
import { downloadReport } from "@/lib/supabase";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
  pdfUrl: string;
}

export function ReportSegment({ segment, reportId, pdfUrl }: ReportSegmentProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

  useEffect(() => {
    const renderPreview = async () => {
      if (!canvasRef.current || segment.pageIndex === undefined) return;
      
      try {
        setIsLoading(true);
        // Get the PDF blob
        const pdfBlob = await downloadReport(pdfUrl);
        
        // Render the page to the canvas at a reduced scale (0.5)
        await renderPdfPageToCanvas(pdfBlob, segment.pageIndex, canvasRef.current, 0.5);
        
      } catch (error) {
        console.error('Error rendering PDF preview:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    renderPreview();
  }, [pdfUrl, segment.pageIndex]);

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
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[180px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading preview...</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded border">
              <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto mx-auto"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
