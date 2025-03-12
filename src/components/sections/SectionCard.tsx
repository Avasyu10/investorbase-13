
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Section } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { 
  AlertTriangle, 
  Globe, 
  CheckCircle, 
  Box, 
  BarChart, 
  TrendingUp, 
  Briefcase, 
  Navigation, 
  Users, 
  DollarSign, 
  HelpCircle 
} from "lucide-react";

interface SectionCardProps {
  section: Section;
  companyId: string;
}

const getMetricIcon = (metricType?: string) => {
  switch (metricType) {
    case 'PROBLEM':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'MARKET':
      return <Globe className="h-4 w-4 text-blue-500" />;
    case 'SOLUTION':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'PRODUCT':
      return <Box className="h-4 w-4 text-indigo-500" />;
    case 'COMPETITIVE_LANDSCAPE':
      return <BarChart className="h-4 w-4 text-purple-500" />;
    case 'TRACTION':
      return <TrendingUp className="h-4 w-4 text-rose-500" />;
    case 'BUSINESS_MODEL':
      return <Briefcase className="h-4 w-4 text-orange-500" />;
    case 'GTM_STRATEGY':
      return <Navigation className="h-4 w-4 text-cyan-500" />;
    case 'TEAM':
      return <Users className="h-4 w-4 text-teal-500" />;
    case 'FINANCIALS':
      return <DollarSign className="h-4 w-4 text-emerald-500" />;
    case 'ASK':
      return <HelpCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

export function SectionCard({ section, companyId }: SectionCardProps) {
  const metricIcon = getMetricIcon(section.metric_type);

  return (
    <Link to={`/companies/${companyId}/sections/${section.id}`} className="block hover:no-underline">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {metricIcon}
            <h3 className="font-semibold">{section.name}</h3>
          </div>
          <div className="text-2xl font-bold">{section.score}</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span>{section.score}/{section.max_score}</span>
            </div>
            <Progress value={(section.score / section.max_score) * 100} className="h-2" />
            {section.description && (
              <p className="text-sm text-muted-foreground mt-2">{section.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
