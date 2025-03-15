
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { ArrowUpRight, Lightbulb } from "lucide-react";

interface ScoreAssessmentProps {
  company: CompanyDetailed;
}

export function ScoreAssessment({ company }: ScoreAssessmentProps) {
  // Format overall score to 1 decimal place
  const formattedScore = parseFloat(company.overallScore.toFixed(1));
  
  // Get score color class
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-amber-600";
    if (score >= 1.5) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardHeader className="bg-secondary/50 border-b pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          <span className={`text-xl font-bold ${getScoreColor(formattedScore)}`}>
            {formattedScore}/5
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {company.assessmentPoints && company.assessmentPoints.length > 0 ? (
          <div className="space-y-3">
            {company.assessmentPoints.map((point, index) => (
              <div key={index} className="flex gap-3 items-start">
                <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 items-start">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">The AI analysis provides a comprehensive overview of the company's strengths and areas for improvement, helping you make informed investment decisions.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-4">
        <Link 
          to={`/company/${company.id}/analysis`}
          className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors"
        >
          View Full Analysis <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
