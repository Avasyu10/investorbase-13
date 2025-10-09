import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubmissionEvaluations } from "@/hooks/useSubmissionEvaluations";
import sampleEvaluations from '@/lib/sampleEvaluations';
import { FileText } from "lucide-react";
import { SubmissionEvaluationCard } from "@/components/evaluation/SubmissionEvaluationCard";
import { useState } from 'react';

export function EvaluationHistory() {
  const { data: evaluations, isLoading, error } = useSubmissionEvaluations();
  const [selected, setSelected] = useState<any | null>(null);

  if (error) {
    console.error('Error fetching submission evaluations:', error);
    const msg = (error instanceof Error && error.message) ? error.message : JSON.stringify(error);
    return (
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Error loading evaluations. Please try again.</p>
          <p className="text-center text-muted-foreground mt-2">{msg}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const showDemo = !evaluations || evaluations.length === 0;

  if (showDemo) {
    return (
      <div>
        <Card className="backdrop-blur-sm bg-card/50 border-border/50 mb-4">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No evaluations yet. Below is a demo evaluation to show how results will appear.</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sampleEvaluations.map((ev: any) => (
            <div key={ev.id}>
              <SubmissionEvaluationCard evaluation={ev} onOpen={(e: any) => setSelected(e)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {evaluations.map((ev: any) => (
          <div key={ev.id}>
            <SubmissionEvaluationCard evaluation={ev} onOpen={(e: any) => setSelected(e)} />
          </div>
        ))}
      </div>

      {/* Details modal - simple inline panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card/60 backdrop-blur-md border p-6 max-w-4xl w-full mx-4 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold">{selected.startup_name} — Evaluation Details</h3>
              <button className="text-muted-foreground" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Problem Statement</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.problem_statement}</p>
                <h4 className="font-semibold mt-4 mb-2">AI Analysis</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.ai_analysis_summary}</p>
                <h4 className="font-semibold mt-4 mb-2">Recommendations</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.ai_recommendations}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Score Breakdown</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(selected).filter(k => k.endsWith('_score')).map((k: string) => (
                    <div key={k} className="p-2 bg-background/50 rounded">
                      <div className="text-xs text-muted-foreground">{k.replace(/_/g, ' ').replace('score', '').trim()}</div>
                      <div className="font-bold">{selected[k]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}