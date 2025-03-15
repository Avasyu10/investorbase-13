
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SectionBase } from "@/lib/api/apiContract";

interface SectionCardProps {
  section: SectionBase;
  onClick: () => void;
}

export function SectionCard({ section, onClick }: SectionCardProps) {
  const navigate = useNavigate();

  // Format score to 1 decimal place
  const scoreValue = parseFloat(section.score.toFixed(1));

  const getScoreColor = (score: number) => {
    if (score >= 4) return "bg-green-500";
    if (score >= 3) return "bg-yellow-500";
    if (score >= 2) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-2 line-clamp-1">{section.title}</h3>
        <div className="flex items-center mb-2">
          <span className="font-medium text-lg mr-2">{scoreValue}/5</span>
          <Progress 
            value={section.score * 20} 
            className={`h-2 flex-1 ${getScoreColor(section.score)}`} 
          />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 h-[60px]">
          {section.description || 'No description available'}
        </p>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <div className="text-xs text-muted-foreground">
          Click to view details
        </div>
      </CardFooter>
    </Card>
  );
}
