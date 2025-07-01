import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { ArrowUpRight, Lightbulb, BarChart2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MarketResearch } from "./MarketResearch";

interface ScoreAssessmentProps {
  company: CompanyDetailed;
}

export function ScoreAssessment({ company }: ScoreAssessmentProps) {
  // Always use 100-point scale
  const rawScore = company.overall_score;
  const displayScore = Math.min(100, Math.max(0, rawScore));
  
  // Calculate progress percentage
  const progressPercentage = displayScore;
  
  // Get score color class based on 100-point scale
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600"; 
    if (score >= 40) return "text-amber-600";
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };
  
  // Get score description based on 100-point scale
  const getScoreDescription = (score: number): string => {
    if (score >= 80) return `Excellent Investment Opportunity (${score}/100): Outstanding company with exceptional potential, strong fundamentals, and minimal risk factors.`;
    if (score >= 60) return `Good Investment Candidate (${score}/100): Solid company with good potential and manageable risks. Worth serious consideration.`;
    if (score >= 40) return `Average Investment Potential (${score}/100): Decent fundamentals but several areas need improvement. Moderate risk factors exist.`;
    if (score >= 20) return `Below Average Investment (${score}/100): Significant concerns exist. Requires extensive due diligence and improvements.`;
    return `Poor Investment Prospect (${score}/100): Major deficiencies across multiple areas. High risk, not recommended without substantial changes.`;
  };

  // Format the displayed score
  const formattedScore = Math.round(displayScore);

  // Highlight numbers in assessment points
  const highlightNumbers = (text: string) => {
    return text.replace(/(\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?[KMBTkmbt]?|\d+(?:\.\d+)?[KMBTkmbt])/g, 
      (match) => `<span class="font-medium text-primary">${match}</span>`);
  };

  return (
    <>
      <Card className="mb-8 shadow-card border-0">
        <CardHeader className="bg-secondary/50 border-b pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Overall Assessment
            </CardTitle>
            <div className="flex items-center">
              <span className={`text-xl font-bold ${getScoreColor(displayScore)}`}>
                {formattedScore}/100
              </span>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="max-w-[320px] text-xs">
                    <p>{getScoreDescription(displayScore)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {company.assessment_points && company.assessment_points.length > 0 ? (
            <div className="space-y-3">
              {company.assessment_points.map((point, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p 
                    className="text-sm text-muted-foreground" 
                    dangerouslySetInnerHTML={{ __html: highlightNumbers(point) }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 items-start">
              <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                No assessment points available. The AI analysis typically provides a comprehensive overview 
                of the company's strengths and areas for improvement, including quantitative metrics to help 
                you make informed investment decisions.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Link 
            to={`/company/${company.id.toString()}/analysis`}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors"
          >
            View Full Analysis <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardFooter>
      </Card>
      
      {/* Add Market Research component */}
      <MarketResearch 
        companyId={company.id.toString()} 
        assessmentPoints={company.assessment_points || []} 
      />
    </>
  );
}
