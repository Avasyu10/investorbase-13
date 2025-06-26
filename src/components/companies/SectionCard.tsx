
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
  // Handle both 1-5 and 1-100 scoring scales
  const score = parseFloat(section.score.toString());
  const isHundredScale = score > 5;
  const normalizedScore = isHundredScale ? score / 20 : score; // Convert 1-100 to 1-5
  const progressValue = isHundredScale ? score : score * 20; // Convert to 0-100 for progress bar

  const getScoreColor = (score: number) => {
    const displayScore = isHundredScale ? score / 20 : score;
    if (displayScore >= 4.5) return "text-green-600";
    if (displayScore >= 3.5) return "text-blue-600";
    if (displayScore >= 2.5) return "text-yellow-600";
    if (displayScore >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    const displayScore = isHundredScale ? score / 20 : score;
    if (displayScore >= 4.5) return "default";
    if (displayScore >= 3.5) return "secondary";
    if (displayScore >= 2.5) return "outline";
    return "destructive";
  };

  const formatSectionTitle = (title: string, sectionType?: string) => {
    // Handle VC analysis specific section types with custom titles
    if (sectionType) {
      switch (sectionType) {
        case 'PROBLEM':
          return 'Problem Statement';
        case 'MARKET':
          return 'Market Size';
        case 'SOLUTION':
          return 'Solution';
        case 'TRACTION':
          return 'Traction';
        case 'COMPETITIVE_LANDSCAPE':
          return 'Competitor';
        case 'BUSINESS_MODEL':
          return 'Business Model';
        case 'TEAM':
          return 'Team';
        case 'FINANCIALS':
          return 'Financials';
        case 'ASK':
          return 'Ask';
        // Handle Eureka form specific section types
        case 'problem_solution_fit':
          return 'Problem & Solution';
        case 'target_customers':
          return 'Target Customers';
        case 'competitors':
          return 'Competitors';
        case 'revenue_model':
          return 'Revenue Model';
        case 'differentiation':
          return 'Differentiation';
        default:
          break;
      }
    }
    
    // Use the title from the section directly if it's already formatted
    if (title && title.includes('&')) {
      return title; // Already formatted titles like "Problem & Solution"
    }
    
    // Fallback to formatting for older sections
    return title
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const displayScore = isHundredScale ? score : normalizedScore;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-subtle hover:scale-105 h-full flex flex-col"
      onClick={onClick}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{formatSectionTitle(section.title, section.section_type)}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Star className="h-4 w-4 text-yellow-500" />
            <Badge variant={getScoreBadgeVariant(score)} className="text-xs">
              {isHundredScale ? Math.round(score) : normalizedScore.toFixed(1)}
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
