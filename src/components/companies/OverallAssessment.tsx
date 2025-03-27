
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/types/company";

interface OverallAssessmentProps {
  company?: any;
  overallScore?: string;
  sections?: Section[];
}

export function OverallAssessment({ company, overallScore = "0", sections = [] }: OverallAssessmentProps) {
  const [showAllPoints, setShowAllPoints] = useState(false);
  
  // Format section data for the chart
  const chartData = sections
    .filter(section => section.score !== null && section.score !== undefined)
    .map(section => ({
      name: section.title,
      score: parseFloat(section.score.toString()),
      average: 3.0 // You could calculate this based on actual data
    }))
    .slice(0, 7); // Limit to 7 sections for the chart
  
  // Format assessment points for display
  const assessmentPoints = company && Array.isArray(company.assessment_points) ? company.assessment_points : [];
  
  // Get color class based on score
  const getScoreClass = () => {
    const score = parseFloat(overallScore);
    
    if (score >= 4.5) return "text-green-500";
    if (score >= 3.5) return "text-green-400";
    if (score >= 2.5) return "text-yellow-500";
    if (score >= 1.5) return "text-amber-500";
    return "text-red-500";
  };
  
  // Get background color based on score
  const getScoreBgClass = () => {
    const score = parseFloat(overallScore);
    
    if (score >= 4.5) return "bg-green-500 text-white";
    if (score >= 3.5) return "bg-green-400 text-white";
    if (score >= 2.5) return "bg-yellow-400 text-black";
    if (score >= 1.5) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4">
              <div className={`text-5xl font-bold mb-2 ${getScoreClass()}`}>
                {overallScore}
              </div>
              <Badge className={`${getScoreBgClass()} px-3 py-1`}>
                {parseFloat(overallScore) >= 4.0 ? "Excellent" : 
                 parseFloat(overallScore) >= 3.0 ? "Good" : 
                 parseFloat(overallScore) >= 2.0 ? "Average" : 
                 "Below Average"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    height={50}
                    interval={0}
                    tickMargin={5}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} 
                            y={0} 
                            dy={16} 
                            fontSize={10}
                            textAnchor="middle" 
                            fill="#888"
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    ticks={[0, 1, 2, 3, 4, 5]} 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value.toFixed(1)}`, 'Score']}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)', 
                      borderColor: 'var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    animationDuration={500}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#888" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Key Assessment Points</CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentPoints.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No assessment points available.</p>
          ) : (
            <div className="space-y-4">
              <ul className="space-y-2">
                {assessmentPoints
                  .slice(0, showAllPoints ? assessmentPoints.length : 5)
                  .map((point: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <ArrowUpRight className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
              </ul>
              
              {assessmentPoints.length > 5 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAllPoints(!showAllPoints)}
                  className="mt-2"
                >
                  {showAllPoints ? "Show Less" : `Show All (${assessmentPoints.length})`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
