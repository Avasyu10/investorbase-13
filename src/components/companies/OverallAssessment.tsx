import { Card, CardContent } from "@/components/ui/card";
import { getScoreColor } from "@/lib/utils";

interface SectionBase {
  id: string;
  type: string;
  title: string;
  score: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Section extends SectionBase {
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
}

interface OverallAssessmentProps {
  sections: Section[];
}

export function OverallAssessment({ sections }: OverallAssessmentProps) {
  return (
    <Card className="shadow-md border bg-card overflow-hidden">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Overall Assessment</h2>
        <p className="text-sm text-muted-foreground mb-6">
          A breakdown of key areas and scores based on the pitch deck analysis.
        </p>
        <div className="space-y-4">
          {sections.map((section) => {
            const { id, title, score } = section;
            return (
              <div key={id} className="mb-2">
                {/* Replace the line with duplicate className attribute */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${getScoreColor(score)}`}>
                      {score.toFixed(1)}
                    </span>
                    <span className="ml-2 text-base font-medium">{title}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {score.toFixed(1)} / 5.0
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
