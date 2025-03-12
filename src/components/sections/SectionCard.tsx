
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Section } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
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

interface SectionCardProps {
  section: Section;
  companyId: string;
}

export function SectionCard({ section, companyId }: SectionCardProps) {
  const getMetricIcon = (): LucideIcon => {
    // Try to determine metric type from section name or metric_type if available
    const metricType = section.metric_type || section.name.toUpperCase();
    
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
  const metricType = section.metric_type || section.name.toUpperCase();
  
  return (
    <Link to={`/companies/${companyId}/sections/${section.id}`} className="block hover:no-underline">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <MetricIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">{section.name}</h3>
          </div>
          <div className="text-2xl font-bold">{section.score}</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-1">
              {metricType}
            </div>
            {section.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{section.description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span>{section.score}/{section.max_score}</span>
            </div>
            <Progress value={(section.score / section.max_score) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
