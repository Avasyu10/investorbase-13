
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, Star, Building, RefreshCw } from "lucide-react";
import { BarcSubmission, BarcAnalysisResult } from "@/types/barc-analysis";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface BarcAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: BarcSubmission | null;
  onRefresh?: () => void;
}

export const BarcAnalysisModal = ({ isOpen, onClose, submission, onRefresh }: BarcAnalysisModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!submission?.analysis_result) {
    return null;
  }

  const analysis = submission.analysis_result;
  const sections = analysis.sections || {};

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'Accept':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Consider':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'Reject':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Accept':
        return 'bg-green-100 text-green-800';
      case 'Consider':
        return 'bg-yellow-100 text-yellow-800';
      case 'Reject':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewCompany = () => {
    if (submission.company_id) {
      navigate(`/company/${submission.company_id}`);
      onClose();
    } else {
      toast({
        title: "Company not found",
        description: "The company profile is not available yet. Please try refreshing the data.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      toast({
        title: "Refreshing data",
        description: "Checking for updated company information...",
      });
    }
  };

  const getSectionCards = () => {
    const sectionKeys = [
      { key: 'problem_solution_fit', title: 'Problem-Solution Fit' },
      { key: 'market_opportunity', title: 'Market Opportunity' },
      { key: 'competitive_advantage', title: 'Competitive Advantage' },
      { key: 'team_strength', title: 'Team Strength' },
      { key: 'execution_plan', title: 'Execution Plan' }
    ];

    return sectionKeys.map(({ key, title }) => {
      const section = sections[key as keyof typeof sections];
      if (!section) return null;

      return (
        <Card key={key} className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>{title}</span>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-bold text-lg">{Math.round(section.score)}/100</span>
              </div>
            </CardTitle>
            <Progress value={section.score} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {section.analysis}
            </p>
            
            {section.strengths && section.strengths.length > 0 && (
              <div>
                <h5 className="font-medium text-green-700 mb-2">Strengths:</h5>
                <ul className="list-disc list-inside space-y-1">
                  {section.strengths.map((strength: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-600">{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {section.improvements && section.improvements.length > 0 && (
              <div>
                <h5 className="font-medium text-amber-700 mb-2">Areas for Improvement:</h5>
                <ul className="list-disc list-inside space-y-1">
                  {section.improvements.map((improvement: string, idx: number) => (
                    <li key={idx} className="text-sm text-amber-600">{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Analysis Results - {submission.company_name}</span>
            <div className="flex items-center gap-2">
              {getRecommendationIcon(analysis.recommendation)}
              <Badge className={getRecommendationColor(analysis.recommendation)}>
                {analysis.recommendation}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Score</span>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{Math.round(analysis.overall_score)}/100</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={analysis.overall_score} className="h-3 mb-4" />
              <p className="text-sm text-muted-foreground">
                {analysis.summary?.overall_feedback}
              </p>
            </CardContent>
          </Card>

          {/* Company Link for All Analyzed Applications */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-800">
                    {submission.company_id ? 'Company Profile Available' : 'Company Profile Being Created'}
                  </h4>
                  <p className="text-sm text-blue-600">
                    {submission.company_id 
                      ? 'This application has been processed and added to your prospects'
                      : 'The company profile is being created. Please check the Prospects tab or refresh this view.'
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {submission.company_id && (
                  <Button
                    onClick={handleViewCompany}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    View Company Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Scores */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
            {getSectionCards()}
          </div>

          {/* Summary */}
          {analysis.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary & Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.summary.key_factors && analysis.summary.key_factors.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Key Decision Factors:</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.summary.key_factors.map((factor: string, idx: number) => (
                        <li key={idx} className="text-sm">{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analysis.summary.next_steps && analysis.summary.next_steps.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Suggested Next Steps:</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.summary.next_steps.map((step: string, idx: number) => (
                        <li key={idx} className="text-sm">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
