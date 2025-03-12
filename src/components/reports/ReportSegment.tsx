
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
  
  // Truncate content if it's too long
  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

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
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p>{truncateContent(segment.content)}</p>
          
          {/* Visualization for financial data */}
          {segment.id.includes('financial') && (
            <div className="mt-4 h-32 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Financial chart visualization</p>
            </div>
          )}
          
          {/* Visualization for metrics and operational data */}
          {(segment.id.includes('metrics') || segment.id.includes('operation')) && (
            <div className="mt-4 h-32 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Operations metrics visualization</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
