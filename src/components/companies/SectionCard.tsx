
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { Section } from "@/lib/api/apiContract";

interface SectionCardProps {
  section: Section;
  onClick: () => void;
}

export const SectionCard = ({ section, onClick }: SectionCardProps) => {
  const score = parseFloat(section.score.toString());
  const progressValue = score * 20; // Convert 1-5 scale to 0-100

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-yellow-600";
    if (score >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4.5) return "default";
    if (score >= 3.5) return "secondary";
    if (score >= 2.5) return "outline";
    return "destructive";
  };

  const formatSectionTitle = (title: string) => {
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{formatSectionTitle(section.title)}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Star className="h-4 w-4 text-yellow-500" />
            <Badge variant={getScoreBadgeVariant(score)} className="text-xs">
              {score.toFixed(1)}
            </Badge>
          </div>
        </CardTitle>
        <Progress value={progressValue} className="h-2" />
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col overflow-hidden">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-shrink-0">
          {section.description || "No description available"}
        </p>
        
        {/* Show strengths and weaknesses if available */}
        <div className="space-y-3 flex-1 overflow-hidden">
          {section.strengths && section.strengths.length > 0 && (
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs flex-1 min-w-0">
                <span className="font-medium text-green-700">Strengths:</span>
                <div className="text-green-600 mt-1 space-y-0.5">
                  {section.strengths.slice(0, 2).map((strength, idx) => (
                    <div key={idx} className="line-clamp-1 break-words">• {strength}</div>
                  ))}
                  {section.strengths.length > 2 && (
                    <div className="text-green-500 text-xs">+{section.strengths.length - 2} more</div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {section.weaknesses && section.weaknesses.length > 0 && (
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs flex-1 min-w-0">
                <span className="font-medium text-red-700">Weaknesses:</span>
                <div className="text-red-600 mt-1 space-y-0.5">
                  {section.weaknesses.slice(0, 2).map((weakness, idx) => (
                    <div key={idx} className="line-clamp-1 break-words">• {weakness}</div>
                  ))}
                  {section.weaknesses.length > 2 && (
                    <div className="text-red-500 text-xs">+{section.weaknesses.length - 2} more</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
