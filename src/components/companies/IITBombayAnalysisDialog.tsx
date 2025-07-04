
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, ExternalLink, TrendingUp, Users, Target, Lightbulb } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface IITBombayAnalysisDialogProps {
  sections: any[];
  companyName: string;
  overallScore: number;
}

export function IITBombayAnalysisDialog({ sections, companyName, overallScore }: IITBombayAnalysisDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Process sections data for charts
  const sectionChartData = sections.map(section => ({
    name: section.title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: parseFloat(section.score.toString()),
    maxScore: 5
  }));

  // Radar chart data
  const radarData = sections.map(section => ({
    section: section.title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).substring(0, 12),
    value: parseFloat(section.score.toString()),
    fullMark: 5
  }));

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return "text-emerald-600";
    if (score >= 3.0) return "text-blue-600";
    if (score >= 2.0) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.0) return "Excellent";
    if (score >= 3.0) return "Good";
    if (score >= 2.0) return "Average";
    return "Needs Improvement";
  };

  const generateAnalysisSummary = () => {
    const avgScore = sections.reduce((sum, section) => sum + parseFloat(section.score.toString()), 0) / sections.length;
    const highScoringSections = sections.filter(s => parseFloat(s.score.toString()) >= 4.0);
    const lowScoringSections = sections.filter(s => parseFloat(s.score.toString()) < 2.5);

    return {
      avgScore,
      highScoringSections,
      lowScoringSections,
      totalSections: sections.length
    };
  };

  const summary = generateAnalysisSummary();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            Full Analysis Report - {companyName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[75vh] pr-4">
          <div className="space-y-8">
            {/* Score Overview */}
            <div className="bg-secondary/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(summary.avgScore)}`}>
                    {summary.avgScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                  <div className={`text-sm font-medium ${getScoreColor(summary.avgScore)} mt-1`}>
                    {getScoreLabel(summary.avgScore)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {summary.highScoringSections.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Strong Areas</div>
                  <div className="text-xs text-emerald-600 mt-1">Score ≥ 4.0</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.lowScoringSections.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Areas for Improvement</div>
                  <div className="text-xs text-red-600 mt-1">Score &lt; 2.5</div>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Performance Radar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis 
                          dataKey="section" 
                          tick={{ fontSize: 10 }}
                          className="fill-foreground"
                        />
                        <PolarRadiusAxis 
                          domain={[0, 5]} 
                          tick={{ fontSize: 10 }}
                          className="fill-muted-foreground"
                        />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    Section Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={10}
                          interval={0}
                        />
                        <YAxis domain={[0, 5]} fontSize={10} />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value) => [`${value}/5`, "Score"]}
                        />
                        <Bar 
                          dataKey="score" 
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Section Performance Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Section Performance Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section, index) => {
                  const score = parseFloat(section.score.toString());
                  return (
                    <Card key={index} className={`border-l-4 ${
                      score >= 4.0 ? 'border-l-emerald-500' :
                      score >= 3.0 ? 'border-l-blue-500' :
                      score >= 2.0 ? 'border-l-amber-500' : 'border-l-red-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            {section.title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                            {score.toFixed(1)}/5
                          </span>
                        </div>
                        <Progress value={(score / 5) * 100} className="h-2 mb-2" />
                        <div className={`text-xs ${getScoreColor(score)}`}>
                          {getScoreLabel(score)}
                        </div>
                        {section.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {section.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Key Insights */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summary.highScoringSections.length > 0 && (
                  <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <CardHeader>
                      <CardTitle className="text-emerald-800 dark:text-emerald-200 text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                        {summary.highScoringSections.map((section, index) => (
                          <li key={index}>
                            • {section.title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                            <span className="font-semibold"> ({parseFloat(section.score.toString()).toFixed(1)}/5)</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {summary.lowScoringSections.length > 0 && (
                  <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardHeader>
                      <CardTitle className="text-red-800 dark:text-red-200 text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {summary.lowScoringSections.map((section, index) => (
                          <li key={index}>
                            • {section.title.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                            <span className="font-semibold"> ({parseFloat(section.score.toString()).toFixed(1)}/5)</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader>
                <CardTitle className="text-blue-800 dark:text-blue-200">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    <strong>Focus Areas:</strong> Based on the analysis, prioritize improving sections with scores below 2.5 
                    to enhance overall performance.
                  </p>
                  <p>
                    <strong>Leverage Strengths:</strong> Build upon the strong performing areas (score ≥ 4.0) to create 
                    competitive advantages.
                  </p>
                  <p>
                    <strong>Balanced Development:</strong> Aim for consistent performance across all sections to achieve 
                    sustainable growth.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
