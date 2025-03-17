
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

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
  };
  
  const getScoreDescription = (score: number): string => {
    if (score >= 4.5) return "Excellent - This aspect is expertly handled and provides strong competitive advantage";
    if (score >= 3.5) return "Very Good - This aspect is well executed with minor room for improvement";
    if (score >= 2.5) return "Good - This aspect is solid but has several areas that need attention";
    if (score >= 1.5) return "Fair - This aspect requires significant improvements";
    return "Poor - This aspect needs comprehensive revision";
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
            value={section.score * 20} 
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
