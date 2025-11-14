
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";

interface OverallAssessmentProps {
  score: number;
  maxScore?: number;
  assessmentPoints?: string[];
  companyId?: string;
  companyName?: string;
}

export function OverallAssessment({ 
  score, 
  maxScore = 100,
  assessmentPoints = [],
  companyId,
  companyName
}: OverallAssessmentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isVCAndBits, isEximius } = useProfile();
  
  // Convert 0-20 score to 0-100 percentage to match dashboard display
  const percentageScore = Math.round((score / 20) * 100);
  const displayScore = percentageScore;
  const displayMaxScore = 100;
  const progressPercentage = percentageScore;
  
  // Format score as integer
  const formattedScore = percentageScore;

  // Default assessment points if none provided (6-7 points)
  const defaultAssessmentPoints = [
    "This company shows strong potential for growth in their target market segment based on current industry trends and their solution approach.",
    "The founding team demonstrates relevant experience and domain expertise that aligns with successful startup patterns in this sector.",
    "The business model presents clear revenue opportunities and scalability potential, though market penetration costs need consideration.",
    "Market timing appears favorable for this type of solution, with industry growth rates supporting early adoption scenarios.",
    "Customer acquisition strategy shows promise but requires validation against industry benchmarks for sustainable growth.",
    "Competitive positioning demonstrates some differentiation, though market dynamics suggest challenges in maintaining advantages long-term.",
    "Further validation of customer demand and competitive positioning would strengthen the proposition for investment readiness."
  ];

  const displayPoints = assessmentPoints && assessmentPoints.length > 0 
    ? assessmentPoints 
    : defaultAssessmentPoints;

  // Comprehensive section breakdown data - all on 100-point scale (matching dashboard)
  const sectionBreakdownData = [
    { name: "Problem", score: 82, color: "hsl(var(--chart-1))" },
    { name: "Market", score: 78, color: "hsl(var(--chart-2))" },
    { name: "Solution", score: 85, color: "hsl(var(--chart-3))" },
    { name: "Product", score: 75, color: "hsl(var(--chart-4))" },
    { name: "Competition", score: 70, color: "hsl(var(--chart-5))" },
    { name: "Traction", score: 88, color: "hsl(var(--chart-1))" },
    { name: "Business Model", score: 80, color: "hsl(var(--chart-2))" },
    { name: "GTM Strategy", score: 73, color: "hsl(var(--chart-3))" },
    { name: "Team", score: 90, color: "hsl(var(--chart-4))" },
    { name: "Financials", score: 77, color: "hsl(var(--chart-5))" },
    { name: "Ask & Use", score: 81, color: "hsl(var(--chart-1))" }
  ];

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--chart-1))",
    },
  };

  const getScoreColor = (score: number) => {
    // 100-point scale colors (matching dashboard)
    if (score >= 75) return "text-blue-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    // 100-point scale labels (matching dashboard)
    if (score >= 75) return "High Potential";
    if (score >= 50) return "Medium Potential";
    return "Low Potential";
  };

  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className={`text-xl font-bold ${getScoreColor(displayScore)}`}>
                {formattedScore}
              </span>
              <span className="text-sm text-muted-foreground">/{displayMaxScore}</span>
            </div>
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
        
        <div className="space-y-1">
          {displayPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-1.5 rounded-lg border-0"
            >
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="link" 
                className="text-amber-500 hover:text-amber-400 flex items-center gap-1 px-0"
              >
                View Full Analysis <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Full Analysis Report
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[75vh] pr-4">
                <div className="space-y-8">
                  {/* Score Overview */}
                  <div className="bg-secondary/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Score Overview</h3>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold ${getScoreColor(displayScore)}`}>
                          {formattedScore}
                        </div>
                        <div className="text-sm text-muted-foreground">out of {displayMaxScore}</div>
                      </div>
                      <div className={`text-sm font-medium ${getScoreColor(displayScore)}`}>
                        {getScoreLabel(displayScore)}
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                  </div>

                  {/* Section Performance Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-primary" />
                      Section Performance Analysis
                    </h3>
                    <div className="bg-card border rounded-lg p-6">
                      <ChartContainer config={chartConfig} className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sectionBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis domain={[0, 100]} />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [`${value}/100`, "Score"]}
              />
                            <Bar 
                              dataKey="score" 
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Detailed Assessment Points
                    </h3>
                    <div className="space-y-4">
                      {displayPoints.map((point, index) => (
                        <div 
                          key={index} 
                          className="bg-card border rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 rounded-full p-2 shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {index + 1}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{point}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comprehensive Score Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Comprehensive Score Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectionBreakdownData.map((section, index) => (
                        <div key={index} className="bg-card border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">{section.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {section.score}/100
                            </span>
                          </div>
                          <Progress value={section.score} className="h-2" />
                          <div className="mt-2 text-xs text-muted-foreground">
                            {section.score >= 75 ? "High Potential" : 
                             section.score >= 50 ? "Medium Potential" : 
                             "Low Potential"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Strengths</h4>
                        <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                          <li>• Strong team with proven track record</li>
                          <li>• Significant market traction</li>
                          <li>• Clear product-market fit</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Areas for Improvement</h4>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                          <li>• Competitive positioning needs strengthening</li>
                          <li>• GTM strategy requires refinement</li>
                          <li>• Financial projections need validation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
