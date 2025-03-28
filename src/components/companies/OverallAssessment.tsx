
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink, Search } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface OverallAssessmentProps {
  score: number;
  maxScore?: number;
  assessmentPoints?: string[];
  onInvestorResearchClick?: () => void;
}

export function OverallAssessment({ 
  score, 
  maxScore = 5,
  assessmentPoints = [
    "The global remote patient monitoring market is projected to reach $175.2 billion by 2030, growing at a CAGR of 17.1%, presenting a significant opportunity for PulseGuard.",
    "PulseGuard's 30% reduction in hospital readmissions from pilot programs is a strong proof point, but more data is needed to validate the results.",
    "The company's business model is based on subscription-based revenue, data analytics services, and value-added partnerships, providing multiple revenue streams.",
    "The team has a strong combination of clinical, technical, and operational expertise, increasing the likelihood of success.",
    "PulseGuard is seeking $2.5M in seed capital to accelerate product development, expand go-to-market initiatives, and ensure regulatory compliance, a reasonable ask for a seed-stage company."
  ],
  onInvestorResearchClick
}: OverallAssessmentProps) {
  // Calculate progress percentage
  const progressPercentage = (score / maxScore) * 100;
  
  // Format score to one decimal place
  const formattedScore = typeof score === 'number' ? score.toFixed(1) : '0.0';

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
          {assessmentPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg border-0"
            >
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <Button 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            onClick={onInvestorResearchClick}
          >
            <Search className="h-4 w-4" />
            Investor Research
          </Button>
          
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
