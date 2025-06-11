
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface OverallAssessmentProps {
  score: number;
  maxScore?: number;
  assessmentPoints?: string[];
}

export function OverallAssessment({ 
  score, 
  maxScore = 5,
  assessmentPoints = []
}: OverallAssessmentProps) {
  // Calculate progress percentage
  const progressPercentage = (score / maxScore) * 100;
  
  // Format score to one decimal place
  const formattedScore = typeof score === 'number' ? score.toFixed(1) : '0.0';

  // Default assessment points if none provided
  const defaultAssessmentPoints = [
    "This company shows strong potential for growth in their target market segment.",
    "The founding team demonstrates relevant experience and domain expertise.",
    "The business model presents clear revenue opportunities and scalability potential.",
    "Market timing appears favorable for this type of solution.",
    "Further validation of customer demand and competitive positioning would strengthen the proposition."
  ];

  const displayPoints = assessmentPoints && assessmentPoints.length > 0 
    ? assessmentPoints 
    : defaultAssessmentPoints;

  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-emerald-400">{formattedScore}</span>
            <span className="text-sm text-muted-foreground">/{maxScore}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        <div className="mb-6">
          <Progress 
            value={progressPercentage} 
            className="h-2" 
          />
        </div>
        
        <div className="space-y-4">
          {displayPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg border-0"
            >
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            variant="link" 
            className="text-amber-500 hover:text-amber-400 flex items-center gap-1 px-0"
          >
            View Full Analysis <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
