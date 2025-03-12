
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
  reportId: string;
}

export function ReportSegment({ segment, reportId }: ReportSegmentProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/reports/${reportId}/sections/${segment.id}`);
  };

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
        {segment.pageNumbers && segment.pageNumbers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Page{segment.pageNumbers.length > 1 ? 's' : ''}: {segment.pageNumbers.join(', ')}
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
