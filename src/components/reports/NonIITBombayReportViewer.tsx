
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SlideBySlideViewer } from './SlideBySlideViewer';

interface CompanyOverview {
  companyName: string;
  industry: string;
  stage: string;
  fundingAsk: string;
  summary: string;
}

interface SectionMetric {
  sectionName: string;
  score: number;
  description: string;
}

interface SlideNote {
  slideNumber: number;
  slideTitle: string;
  notes: string[];
}

interface AnalysisResult {
  overallScore: number;
  companyOverview: CompanyOverview;
  sectionMetrics: SectionMetric[];
  slideBySlideNotes: SlideNote[];
}

interface NonIITBombayReportViewerProps {
  analysisResult: AnalysisResult;
  pdfUrl: string;
}

export const NonIITBombayReportViewer = ({ analysisResult, pdfUrl }: NonIITBombayReportViewerProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Company Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Company Overview
            <Badge variant={getScoreBadgeVariant(analysisResult.overallScore)} className="text-lg px-3 py-1">
              {analysisResult.overallScore}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="font-medium text-muted-foreground">Company</h4>
              <p className="text-lg font-semibold">{analysisResult.companyOverview.companyName}</p>
            </div>
            <div>
              <h4 className="font-medium text-muted-foreground">Industry</h4>
              <p className="text-lg">{analysisResult.companyOverview.industry}</p>
            </div>
            <div>
              <h4 className="font-medium text-muted-foreground">Stage</h4>
              <p className="text-lg">{analysisResult.companyOverview.stage}</p>
            </div>
            <div>
              <h4 className="font-medium text-muted-foreground">Funding Ask</h4>
              <p className="text-lg font-semibold">{analysisResult.companyOverview.fundingAsk}</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium text-muted-foreground mb-2">Summary</h4>
            <p className="text-muted-foreground leading-relaxed">{analysisResult.companyOverview.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Section Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Section Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResult.sectionMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{metric.sectionName}</h4>
                  <span className={`font-semibold ${getScoreColor(metric.score)}`}>
                    {metric.score}/100
                  </span>
                </div>
                <Progress value={metric.score} className="h-2" />
                <p className="text-sm text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slide by Slide Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Slide by Slide Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <SlideBySlideViewer 
            pdfUrl={pdfUrl} 
            slideNotes={analysisResult.slideBySlideNotes} 
          />
        </CardContent>
      </Card>
    </div>
  );
};
