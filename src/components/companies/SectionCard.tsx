
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionBase } from "@/lib/api/apiContract";
import { ArrowUpRight } from "lucide-react";

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

  return (
    <Card 
      className="hover:shadow-card transition-all cursor-pointer border bg-card/50 border-0 shadow-subtle"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold line-clamp-1">{section.title}</h3>
          <span className="font-bold text-lg text-primary">{scoreValue}</span>
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
