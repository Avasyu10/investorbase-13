import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Info, Send, TrendingUp } from "lucide-react";

interface Criterion {
  id: string;
  title: string;
  description: string;
  score: number;
  guidelines: string[];
}

export function ProblemStatementEvaluation() {
  const { toast } = useToast();
  
  const [criteria, setCriteria] = useState<Criterion[]>([
    {
      id: "existence",
      title: "Existence of the Problem in the Market",
      description: "Is the problem real and observable in the market?",
      score: 10,
      guidelines: [
        "1–4: No indication the problem exists externally",
        "5–8: Minor or fringe occurrence in market data",
        "9–12: Moderate presence; documented in some segments",
        "13–16: Strong evidence across multiple sources",
        "17–20: Widely recognized and persistent across industry"
      ]
    },
    {
      id: "severity",
      title: "Severity / Negative Consequences",
      description: "How serious is this problem for those experiencing it?",
      score: 10,
      guidelines: [
        "1–4: Negligible impact; minor inconvenience",
        "5–8: Low impact on operations or efficiency",
        "9–12: Moderate impact with measurable consequences",
        "13–16: High impact on efficiency, costs, or outcomes",
        "17–20: Critical problem threatening operations or revenue"
      ]
    },
    {
      id: "frequency",
      title: "Frequency / Pervasiveness",
      description: "How widespread is the problem in the market?",
      score: 10,
      guidelines: [
        "1–4: Extremely rare or niche issue",
        "5–8: Occurs occasionally in small segments",
        "9–12: Moderate frequency in identifiable segments",
        "13–16: High frequency across significant segments",
        "17–20: Very common; affects majority of market"
      ]
    },
    {
      id: "unmet",
      title: "Current Unmet Need / Gap",
      description: "Does the problem represent a real unmet need?",
      score: 10,
      guidelines: [
        "1–4: Problem largely solved by existing solutions",
        "5–8: Some gaps exist but mostly manageable",
        "9–12: Partial solutions with significant inefficiencies",
        "13–16: Current solutions largely ineffective or expensive",
        "17–20: Problem unaddressed at scale; clear gap exists"
      ]
    }
  ]);

  const handleScoreChange = (id: string, value: number[]) => {
    setCriteria(prev => 
      prev.map(c => c.id === id ? { ...c, score: value[0] } : c)
    );
  };

  const averageScore = criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length;
  const averagePercentage = (averageScore / 20) * 100;

  const getScoreColor = (score: number) => {
    if (score <= 8) return "hsl(var(--destructive))";
    if (score <= 14) return "hsl(45 93% 47%)"; // Warning yellow
    return "hsl(142 71% 45%)"; // Success green
  };

  const getScoreBadgeVariant = (score: number): "destructive" | "secondary" | "default" => {
    if (score <= 8) return "destructive";
    if (score <= 14) return "secondary";
    return "default";
  };

  const handleSubmit = () => {
    toast({
      title: "Evaluation Submitted Successfully! 🎉",
      description: `Average Score: ${averageScore.toFixed(1)}/20`,
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Startup Studio Portal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Problem Statement Evaluation
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Evaluate startup ideas based on market problem analysis
          </p>
        </div>

        {/* Criteria Cards */}
        <div className="grid gap-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {criteria.map((criterion, index) => (
            <Card 
              key={criterion.id}
              className="backdrop-blur-sm bg-card/50 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 flex items-center gap-2">
                      {criterion.title}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              {criterion.guidelines.map((guideline, i) => (
                                <p key={i}>{guideline}</p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CardDescription>{criterion.description}</CardDescription>
                  </div>
                  <Badge 
                    variant={getScoreBadgeVariant(criterion.score)}
                    className="text-lg px-4 py-1 font-bold min-w-[60px] justify-center"
                  >
                    {criterion.score}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Slider
                    value={[criterion.score]}
                    onValueChange={(value) => handleScoreChange(criterion.id, value)}
                    min={1}
                    max={20}
                    step={1}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low Impact (1)</span>
                    <span>High Impact (20)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Average Score Display */}
        <Card 
          className="backdrop-blur-sm bg-card/50 border-border/50 shadow-xl animate-fade-in"
          style={{ animationDelay: "0.6s" }}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Overall Evaluation Score</h3>
                <p className="text-muted-foreground">
                  Average across all criteria
                </p>
              </div>
              
              <div className="relative">
                <div className="w-40 h-40 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-primary/30 shadow-lg">
                  <div className="text-center">
                    <div 
                      className="text-5xl font-bold transition-colors duration-300"
                      style={{ color: getScoreColor(averageScore) }}
                    >
                      {averageScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">/ 20</div>
                  </div>
                </div>
                <div className="absolute inset-0">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke={getScoreColor(averageScore)}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - averagePercentage / 100)}`}
                      className="transition-all duration-500 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex-1 text-center md:text-right">
                <div className="inline-block space-y-2">
                  <Progress value={averagePercentage} className="w-48 h-3" />
                  <p className="text-sm text-muted-foreground">
                    {averagePercentage.toFixed(1)}% Complete
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <Button
            onClick={handleSubmit}
            size="lg"
            className="text-lg px-8 py-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Send className="w-5 h-5 mr-2" />
            Submit Evaluation
          </Button>
        </div>
      </div>
    </div>
  );
}
