
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportSegmentProps {
  segment: {
    id: string;
    title: string;
    content: string;
  };
}

export function ReportSegment({ segment }: ReportSegmentProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-md h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{segment.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p>{segment.content}</p>
          
          {/* Visualization placeholder - in a real app, this could be a chart or graph */}
          {segment.id === "financial" && (
            <div className="mt-4 h-32 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Financial chart visualization</p>
            </div>
          )}
          
          {segment.id === "operations" && (
            <div className="mt-4 h-32 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Operations metrics visualization</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
