
import { useQuery } from "@tanstack/react-query";
import { getSectionDetailsBySectionId } from "@/lib/api";
import { SectionDetail as SectionDetailType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart4, 
  Clock, 
  FileText, 
  LucideIcon, 
  PieChart,
  Lightbulb,
  Users,
  Target,
  Briefcase,
  TrendingUp,
  Building,
  DollarSign,
  HelpCircle
} from "lucide-react";

interface SectionDetailProps {
  sectionId: string;
  metricType?: string;
}

export function SectionDetail({ sectionId, metricType }: SectionDetailProps) {
  const { data: details, isLoading, error } = useQuery({
    queryKey: ['section-details', sectionId],
    queryFn: () => getSectionDetailsBySectionId(sectionId),
  });

  const getMetricIcon = (): LucideIcon => {
    switch (metricType) {
      case "PROBLEM":
        return HelpCircle;
      case "MARKET":
        return BarChart4;
      case "SOLUTION":
        return Lightbulb;
      case "PRODUCT":
        return FileText;
      case "COMPETITIVE LANDSCAPE":
        return PieChart;
      case "TRACTION":
        return TrendingUp;
      case "BUSINESS MODEL":
        return Briefcase;
      case "GTM STRATEGY":
        return Target;
      case "TEAM":
        return Users;
      case "FINANCIALS":
        return DollarSign;
      case "ASK":
        return Building;
      default:
        return Clock;
    }
  };

  const MetricIcon = getMetricIcon();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-destructive">
        <h3 className="font-bold">Error loading section details</h3>
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  if (!details || details.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No details found for this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metricType && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MetricIcon className="h-4 w-4" />
          <span>{metricType}</span>
        </div>
      )}
      {details.map((detail: SectionDetailType) => (
        <Card key={detail.id}>
          <CardHeader>
            <CardTitle className="text-lg">{detail.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{detail.content}</p>
            {detail.score_impact && (
              <>
                <Separator />
                <div className={`text-sm font-medium ${detail.score_impact.includes('Positive') ? 'text-green-600' : 
                  detail.score_impact.includes('Negative') ? 'text-red-600' : 'text-amber-600'}`}>
                  {detail.score_impact}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
