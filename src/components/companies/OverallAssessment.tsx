
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface OverallAssessmentProps {
  score: number;
  maxScore?: number;
  assessmentPoints?: string[];
}

export function OverallAssessment({ 
  score, 
  maxScore = 100,
  assessmentPoints = []
}: OverallAssessmentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Calculate progress percentage
  const progressPercentage = (score / maxScore) * 100;
  
  // Format score to whole number
  const formattedScore = Math.round(score);

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Needs Improvement";
  };

  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-emerald-400">{formattedScore}</span>
            <span className="text-sm text-muted-foreground">/{maxScore}</span>
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
        
        <div className="space-y-4">
          {displayPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg border-0"
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Full Analysis Report
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Score Overview */}
                  <div className="bg-secondary/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Score Overview</h3>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-primary">{formattedScore}</div>
                        <div className="text-sm text-muted-foreground">out of {maxScore}</div>
                      </div>
                      <div className={`text-sm font-medium ${getScoreColor(formattedScore)}`}>
                        {getScoreLabel(formattedScore)}
                      </div>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
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

                  {/* Score Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-card border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Market Opportunity</span>
                          <span className="text-sm text-muted-foreground">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div className="bg-card border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Team Strength</span>
                          <span className="text-sm text-muted-foreground">78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                      <div className="bg-card border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Product Innovation</span>
                          <span className="text-sm text-muted-foreground">72%</span>
                        </div>
                        <Progress value={72} className="h-2" />
                      </div>
                      <div className="bg-card border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Business Model</span>
                          <span className="text-sm text-muted-foreground">80%</span>
                        </div>
                        <Progress value={80} className="h-2" />
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
