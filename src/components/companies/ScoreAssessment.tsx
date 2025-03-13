
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";

interface ScoreAssessmentProps {
  company: CompanyDetailed;
}

export function ScoreAssessment({ company }: ScoreAssessmentProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Overall Score Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2">
          {company.assessmentPoints.map((point, index) => (
            <li key={index} className="text-muted-foreground">{point}</li>
          ))}
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
