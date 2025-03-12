
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParsedPdfSegment } from "@/lib/pdf-parser";

interface ReportSegmentProps {
  segment: ParsedPdfSegment;
}

export function ReportSegment({ segment }: ReportSegmentProps) {
  // Truncate content if it's too long
  const truncateContent = (content: string, maxLength = 300) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{segment.title}</CardTitle>
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
