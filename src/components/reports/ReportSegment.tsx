
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PDFPreview } from "./PDFPreview";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
  pdfUrl: string;
}

export function ReportSegment({ segment, reportId, pdfUrl }: ReportSegmentProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md cursor-pointer hover:border-primary/50 overflow-hidden"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg group flex items-center justify-between">
          <span className="line-clamp-1">{segment.title}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-70 group-hover:text-primary flex-shrink-0" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {segment.pageIndex !== undefined && (
          <PDFPreview 
            pdfUrl={pdfUrl}
            pageIndex={segment.pageIndex}
          />
        )}
      </CardContent>
    </Card>
  );
}
