
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
  pdfUrl: string;
}

export function ReportSegment({ segment, reportId }: ReportSegmentProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

  // Display the title or a fallback
  const displayTitle = segment.title || "Untitled Section";
  
  // Extract a short preview of the content (first 100 characters)
  const contentPreview = segment.content && segment.content.length > 0 
    ? segment.content.substring(0, 100) + (segment.content.length > 100 ? '...' : '')
    : 'No content available';

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
        <p className="text-sm text-muted-foreground line-clamp-3">{contentPreview}</p>
        <div className="text-xs text-muted-foreground mt-2">
          Page {segment.pageNumbers?.join(', ')}
        </div>
      </CardContent>
    </Card>
  );
}
