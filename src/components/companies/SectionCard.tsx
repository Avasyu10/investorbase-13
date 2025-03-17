
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionBase } from "@/lib/api/apiContract";
import { ArrowUpRight, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface SectionCardProps {
  section: SectionBase;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const navigate = useNavigate();

  // Format score to 1 decimal place
  const scoreValue = parseFloat(section.score.toFixed(1));
  
  // Calculate progress percentage (0-100 scale) from score (0-5 scale)
  const progressPercentage = scoreValue * 20;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
  };
  
  const getScoreDescription = (score: number): string => {
    if (score >= 4.5) return `Outstanding (${score}/5): This section demonstrates exceptional quality with industry-leading practices, providing significant competitive advantage. No major improvements needed.`;
    if (score >= 3.5) return `Very Good (${score}/5): This section is well executed but has minor opportunities for enhancement. Shows solid understanding of investor expectations.`;
    if (score >= 2.5) return `Satisfactory (${score}/5): Several aspects need improvement, though the foundation is adequate. Some key elements require further development to meet investor standards.`;
    if (score >= 1.5) return `Needs Work (${score}/5): Significant deficiencies exist that would concern potential investors. Requires substantial revisions to meet market expectations.`;
    return `Critical Concerns (${score}/5): This section fails to meet basic standards and requires complete overhaul. Major red flags for investors that need immediate attention.`;
  };

  return (
    <Card 
      className="hover:shadow-card transition-all cursor-pointer border bg-card/50 border-0 shadow-subtle"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold line-clamp-1">{section.title}</h3>
          <div className="flex items-center">
            <span className="font-bold text-lg text-primary">{scoreValue}</span>
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-[260px] text-xs">
                  <p>{getScoreDescription(section.score)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="mb-4">
          <Progress 
            value={progressPercentage} 
            className={`h-1.5 ${getScoreColor(section.score)}`} 
          />
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-3 h-[60px]">
          {section.description || 'No description available'}
        </p>
      </CardContent>
      <CardFooter className="pt-1 pb-4 flex justify-end">
        <span className="text-xs text-primary flex items-center gap-0.5">
          View details <ArrowUpRight className="h-3 w-3" />
        </span>
      </CardFooter>
    </Card>
  );
}
