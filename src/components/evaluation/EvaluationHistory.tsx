import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvaluations } from "@/hooks/useEvaluations";
import { FileText, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export function EvaluationHistory() {
  const { data: evaluations, isLoading, error } = useEvaluations();

  const getScoreColor = (score: number) => {
    if (score <= 8) return "hsl(var(--destructive))";
    if (score <= 14) return "hsl(45 93% 47%)";
    return "hsl(142 71% 45%)";
  };

  const getScoreBadgeVariant = (score: number): "destructive" | "secondary" | "default" => {
    if (score <= 8) return "destructive";
    if (score <= 14) return "secondary";
    return "default";
  };

  if (error) {
    return (
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Error loading evaluations. Please try again.
          </p>
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

  if (!evaluations || evaluations.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No evaluations yet. Submit your first evaluation!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation, index) => (
        <Card 
          key={evaluation.id}
          className="backdrop-blur-sm bg-card/50 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{evaluation.startup_name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(evaluation.created_at), "PPP")}
                </div>
              </div>
              <Badge 
                variant={getScoreBadgeVariant(evaluation.average_score)}
                className="text-lg px-4 py-1 font-bold min-w-[80px] justify-center"
              >
                {evaluation.average_score.toFixed(1)}/20
              </Badge>
            </div>
            <CardDescription className="mt-3 line-clamp-2">
              {evaluation.problem_statement}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Existence</div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: getScoreColor(evaluation.existence_score) }}
                >
                  {evaluation.existence_score}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Severity</div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: getScoreColor(evaluation.severity_score) }}
                >
                  {evaluation.severity_score}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Frequency</div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: getScoreColor(evaluation.frequency_score) }}
                >
                  {evaluation.frequency_score}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <div className="text-xs text-muted-foreground mb-1">Unmet Need</div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: getScoreColor(evaluation.unmet_need_score) }}
                >
                  {evaluation.unmet_need_score}
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {evaluation.ai_analysis_summary && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-primary">AI Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {evaluation.ai_analysis_summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}