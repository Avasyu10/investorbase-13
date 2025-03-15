
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";

interface ScoreAssessmentProps {
  company: CompanyDetailed;
}

export function ScoreAssessment({ company }: ScoreAssessmentProps) {
  // Format overall score to 1 decimal place
  const formattedScore = parseFloat(company.overallScore.toFixed(1));

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Overall Score Assessment: {formattedScore}/5</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2">
          {company.assessmentPoints && company.assessmentPoints.length > 0 ? (
            company.assessmentPoints.map((point, index) => (
              <li key={index} className="text-muted-foreground">{point}</li>
            ))
          ) : (
            <li className="text-muted-foreground">No assessment points available</li>
          )}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link 
          to={`/company/${company.id}/analysis`}
          className="text-sm text-primary hover:underline"
        >
          View Full Analysis Summary →
        </Link>
      </CardFooter>
    </Card>
  );
}
