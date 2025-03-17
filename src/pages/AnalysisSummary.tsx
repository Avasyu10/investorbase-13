
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Maximize } from 'lucide-react';
import { useCompanyDetails } from '@/hooks/useCompanies';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReportViewer } from '@/components/reports/ReportViewer';

export default function AnalysisSummary() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);
  const [showReportModal, setShowReportModal] = useState(false);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p>Company not found. Please return to dashboard.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedScore = parseFloat(company.overallScore.toFixed(1));

  const chartData = company.sections.map(section => ({
    name: section.title,
    score: parseFloat(section.score.toFixed(1)),
    fill: getColorForScore(section.score)
  }));

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/company/${companyId}`)}
        >
          <ChevronLeft className="mr-1" /> Back to Company Details
        </Button>
        
        {company.reportId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReportModal(true)}
          >
            <Maximize className="mr-2 h-4 w-4" />
            View Deck
          </Button>
        )}
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">{company.name}</CardTitle>
            <Badge variant={getScoreVariant(company.overallScore)}>
              Score: {formattedScore}/5
            </Badge>
          </div>
          <CardDescription>Complete analysis summary and market research</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Overall Performance</h3>
            <Progress value={company.overallScore * 20} className="h-2.5 mb-2" />
            <p className="text-sm text-muted-foreground">
              {getScoreDescription(company.overallScore)}
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Key Assessment Points</h3>
            {company.assessmentPoints && company.assessmentPoints.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {company.assessmentPoints.map((point, index) => (
                  <li key={index} className="text-muted-foreground">{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic">No assessment points available</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Section Performance Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 5]} tickCount={6} />
                  <Tooltip formatter={(value) => [`${value}/5`, 'Score']} />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Detailed Section Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.sections.map((section) => (
                <Card key={section.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 pb-2">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">Score: {section.score}/5</span>
                      <Progress 
                        value={section.score * 20} 
                        className={`h-2 flex-1 ${section.score >= 4 ? 'bg-green-100' : section.score >= 2.5 ? 'bg-amber-100' : 'bg-red-100'}`} 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {section.description || 'No description available'}
                    </p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto mt-2"
                      onClick={() => navigate(`/company/${companyId}/section/${section.id}`)}
                    >
                      View Research Details →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Modal */}
      {company.reportId && (
        <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{company.name} - Analysis Report</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-1">
              <ReportViewer reportId={company.reportId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function getColorForScore(score: number): string {
  if (score >= 4) return '#22c55e'; // Green
  if (score >= 3) return '#84cc16'; // Lime green
  if (score >= 2) return '#facc15'; // Yellow
  if (score >= 1) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getScoreVariant(score: number): 'default' | 'outline' | 'secondary' | 'destructive' {
  if (score >= 4) return 'default';
  if (score >= 2.5) return 'secondary';
  if (score >= 1.5) return 'outline';
  return 'destructive';
}

function getScoreDescription(score: number): string {
  if (score >= 4.5) return 'Excellent. The pitch deck is highly effective and investment-ready.';
  if (score >= 3.5) return 'Very good. The pitch deck is strong but has minor areas for improvement.';
  if (score >= 2.5) return 'Good. The pitch deck is solid but has several areas that need attention.';
  if (score >= 1.5) return 'Fair. The pitch deck requires significant improvements in multiple areas.';
  return 'Poor. The pitch deck needs comprehensive revision before being presented to investors.';
}
