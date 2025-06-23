
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionDetail } from "./SectionDetail";

interface SectionDetailType {
  id: string;
  detail_type: string;
  content: string;
}

interface ReportSegmentProps {
  sectionTitle: string;
  score: number;
  description: string;
  sectionDetails: SectionDetailType[];
  sectionType?: string;
}

export const ReportSegment = ({ 
  sectionTitle, 
  score, 
  description, 
  sectionDetails, 
  sectionType 
}: ReportSegmentProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{sectionTitle}</CardTitle>
          <Badge variant={getScoreBadgeVariant(score)} className="text-lg px-3 py-1">
            {score}/100
          </Badge>
        </div>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sectionDetails.map((detail) => (
            <SectionDetail
              key={detail.id}
              type={detail.detail_type}
              content={detail.content}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
