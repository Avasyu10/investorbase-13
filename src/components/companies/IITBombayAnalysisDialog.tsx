
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { CompanyDetailed } from "@/lib/api/apiContract";
import { TrendingUp, Award, AlertCircle, Target } from "lucide-react";

interface IITBombayAnalysisDialogProps {
  company: CompanyDetailed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IITBombayAnalysisDialog({ company, open, onOpenChange }: IITBombayAnalysisDialogProps) {
  // Always use 100-point scale for display
  const rawScore = company.overall_score;
  const displayScore = rawScore > 5 ? rawScore : rawScore * 20;
  
  // Prepare chart data for sections
  const chartData = company.sections?.map(section => {
    const sectionScore = parseFloat(section.score.toString());
    const displaySectionScore = sectionScore > 5 ? sectionScore : sectionScore * 20;
    
    return {
      name: section.title || section.type.replace(/_/g, ' '),
      score: Math.round(displaySectionScore),
      fullName: section.title || section.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  }) || [];

  // Prepare radar chart data
  const radarData = chartData.map(item => ({
    subject: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    score: item.score,
    fullScore: 100
  }));

  // Get score color and description
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600"; 
    if (score >= 20) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 80) return "Outstanding performance with exceptional potential";
    if (score >= 60) return "Good performance with solid fundamentals";
    if (score >= 40) return "Average performance with room for improvement";
    if (score >= 20) return "Below average performance requiring attention";
    return "Poor performance needing significant improvement";
  };

  // Calculate insights
  const highestSection = chartData.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current, chartData[0] || { name: '', score: 0 });
  
  const lowestSection = chartData.reduce((prev, current) => 
    (prev.score < current.score) ? prev : current, chartData[0] || { name: '', score: 100 });

  const averageScore = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Full Analysis Summary - {company.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Performance</span>
                <span className={`text-2xl font-bold ${getScoreColor(displayScore)}`}>
                  {Math.round(displayScore)}/100
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {getScoreDescription(displayScore)}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Average Section Score</p>
                    <p className="text-muted-foreground">{averageScore}/100</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Strongest Area</p>
                    <p className="text-muted-foreground">{highestSection?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold">Focus Area</p>
                    <p className="text-muted-foreground">{lowestSection?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Section Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [`${value}/100`, 'Score']}
                      labelFormatter={(label: string) => {
                        const item = chartData.find(d => d.name === label);
                        return item?.fullName || label;
                      }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="#8884d8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis 
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Assessment Points */}
          {company.assessment_points && company.assessment_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Key Assessment Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {company.assessment_points.slice(0, 5).map((point, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Details */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Section Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chartData.map((section, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <span className="font-medium">{section.fullName}</span>
                      <span className={`font-bold ${getScoreColor(section.score)}`}>
                        {section.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close Analysis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
