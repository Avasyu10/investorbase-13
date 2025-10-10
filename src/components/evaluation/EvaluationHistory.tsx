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

  // Calculate average score from individual scores
  const calculateAverageScore = (evalData: any) => {
    if (evalData.overall_average) return evalData.overall_average;

    const scores = Object.keys(evalData)
      .filter(key => key.endsWith('_score') && evalData[key] !== null)
      .map(key => evalData[key]);

    if (scores.length === 0) return null;

    const sum = scores.reduce((acc: number, score: number) => acc + score, 0);
    return sum / scores.length;
  };

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
      {/* Evaluation Summary */}
      <Card className="backdrop-blur-sm bg-card/50 border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Evaluation Summary</CardTitle>
          <CardDescription>Overview of evaluation performance across all submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const categorized = evaluations.reduce((acc: any, ev: any) => {
              const score = calculateAverageScore(ev);
              if (score === null) {
                acc.noScore = (acc.noScore || 0) + 1;
              } else if (score > 15) {
                acc.veryGood = (acc.veryGood || 0) + 1;
              } else if (score >= 10) {
                acc.medium = (acc.medium || 0) + 1;
              } else {
                acc.veryBad = (acc.veryBad || 0) + 1;
              }
              return acc;
            }, {});

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600">{categorized.veryGood || 0}</div>
                  <div className="text-sm text-muted-foreground">Very Good<br />(Above 15/20)</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-600">{categorized.medium || 0}</div>
                  <div className="text-sm text-muted-foreground">Medium<br />(10-15/20)</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-600">{categorized.veryBad || 0}</div>
                  <div className="text-sm text-muted-foreground">Very Bad<br />(Below 10/20)</div>
                </div>
                <div className="text-center p-4 bg-gray-500/10 rounded-lg border border-gray-500/20">
                  <div className="text-2xl font-bold text-gray-600">{categorized.noScore || 0}</div>
                  <div className="text-sm text-muted-foreground">No Score<br />(Pending)</div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
          <div className="bg-card/60 backdrop-blur-md border p-6 max-w-6xl w-full mx-4 rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selected.startup_name || 'Unnamed Startup'} — Evaluation Details</h3>
                {(() => {
                  const avgScore = calculateAverageScore(selected);
                  return avgScore ? (
                    <p className="text-lg text-muted-foreground">Overall Score: {Number(avgScore).toFixed(1)}/20</p>
                  ) : null;
                })()}
              </div>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Problem Statement</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{selected.problem_statement}</p>
                <h4 className="font-semibold mb-2">AI Analysis Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{selected.ai_analysis_summary}</p>
                <h4 className="font-semibold mb-2">AI Recommendations</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.ai_recommendations}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Detailed Score Breakdown</h4>

                {/* Problem Statement Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Problem Statement</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Existence</div>
                      <div className="font-bold text-lg">{selected.existence_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Severity</div>
                      <div className="font-bold text-lg">{selected.severity_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Frequency</div>
                      <div className="font-bold text-lg">{selected.frequency_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Unmet Need</div>
                      <div className="font-bold text-lg">{selected.unmet_need_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* Solution Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Solution</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Direct Fit</div>
                      <div className="font-bold text-lg">{selected.direct_fit_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Differentiation</div>
                      <div className="font-bold text-lg">{selected.differentiation_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Feasibility</div>
                      <div className="font-bold text-lg">{selected.feasibility_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Effectiveness</div>
                      <div className="font-bold text-lg">{selected.effectiveness_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* Market Understanding Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Market Understanding</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Market Size</div>
                      <div className="font-bold text-lg">{selected.market_size_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Growth Trajectory</div>
                      <div className="font-bold text-lg">{selected.growth_trajectory_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Timing Readiness</div>
                      <div className="font-bold text-lg">{selected.timing_readiness_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">External Catalysts</div>
                      <div className="font-bold text-lg">{selected.external_catalysts_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* Customers Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Customers</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">First Customers</div>
                      <div className="font-bold text-lg">{selected.first_customers_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Accessibility</div>
                      <div className="font-bold text-lg">{selected.accessibility_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Acquisition Approach</div>
                      <div className="font-bold text-lg">{selected.acquisition_approach_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Pain Recognition</div>
                      <div className="font-bold text-lg">{selected.pain_recognition_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* Competition Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Competition</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Direct Competitors</div>
                      <div className="font-bold text-lg">{selected.direct_competitors_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Substitutes</div>
                      <div className="font-bold text-lg">{selected.substitutes_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Diff vs Players</div>
                      <div className="font-bold text-lg">{selected.differentiation_vs_players_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Dynamics</div>
                      <div className="font-bold text-lg">{selected.dynamics_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* USP Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Unique Selling Proposition (USP)</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Clarity</div>
                      <div className="font-bold text-lg">{selected.usp_clarity_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Diff Strength</div>
                      <div className="font-bold text-lg">{selected.usp_differentiation_strength_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Defensibility</div>
                      <div className="font-bold text-lg">{selected.usp_defensibility_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Alignment</div>
                      <div className="font-bold text-lg">{selected.usp_alignment_score}/20</div>
                    </div>
                  </div>
                </div>

                {/* Tech Scores */}
                <div className="mb-4">
                  <h5 className="font-medium text-sm mb-2 text-primary">Technology</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Vision Ambition</div>
                      <div className="font-bold text-lg">{selected.tech_vision_ambition_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Coherence</div>
                      <div className="font-bold text-lg">{selected.tech_coherence_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Alignment</div>
                      <div className="font-bold text-lg">{selected.tech_alignment_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Realism</div>
                      <div className="font-bold text-lg">{selected.tech_realism_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Feasibility</div>
                      <div className="font-bold text-lg">{selected.tech_feasibility_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Components</div>
                      <div className="font-bold text-lg">{selected.tech_components_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Complexity Awareness</div>
                      <div className="font-bold text-lg">{selected.tech_complexity_awareness_score}/20</div>
                    </div>
                    <div className="p-2 bg-background/50 rounded text-center">
                      <div className="text-xs text-muted-foreground">Roadmap</div>
                      <div className="font-bold text-lg">{selected.tech_roadmap_score}/20</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}