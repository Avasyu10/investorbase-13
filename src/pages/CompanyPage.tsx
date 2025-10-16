import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, BarChart2, Lightbulb } from "lucide-react";
import { useStartupDetails } from "@/hooks/useStartupDetails";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SectionVerdict {
  score: number;
  maxScore: number;
  verdict: string;
  detailedScores?: { [key: string]: number };
}

interface SectionVerdicts {
  [key: string]: SectionVerdict;
}

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company, isLoading } = useStartupDetails(id);
  const [sectionVerdicts, setSectionVerdicts] = useState<SectionVerdicts | null>(null);
  const [overallAssessment, setOverallAssessment] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ name: string; data: SectionVerdict } | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch or generate section verdicts
  useEffect(() => {
    const fetchVerdicts = async () => {
      if (!id || !company) return;

      try {
        // Check if verdicts already exist
        const { data: enrichment } = await supabase
          .from('company_enrichment')
          .select('enrichment_data')
          .eq('company_id', id)
          .maybeSingle();

        if (enrichment?.enrichment_data) {
          const enrichmentData = enrichment.enrichment_data as any;
          
          if (enrichmentData.section_verdicts) {
            const verdicts = enrichmentData.section_verdicts;
            const scores = enrichmentData.section_scores;
            
            const formattedVerdicts: SectionVerdicts = {};
            Object.keys(verdicts).forEach((key) => {
              const scoreData = scores?.find((s: any) => s.name === key);
              formattedVerdicts[key] = {
                score: scoreData?.score || 0,
                maxScore: 20,
                verdict: verdicts[key],
                detailedScores: scoreData?.detailedScores || {},
              };
            });

            setSectionVerdicts(formattedVerdicts);

            // Parse overall assessment
            const assessment = enrichmentData.overall_assessment || '';
            const points = assessment.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'));
            setOverallAssessment(points.map((p: string) => p.replace(/^[-•]\s*/, '').trim()));
          } else {
            generateVerdicts();
          }
        } else {
          generateVerdicts();
        }
      } catch (error) {
        console.error('Error fetching verdicts:', error);
      }
    };

    fetchVerdicts();
  }, [id, company]);

  const generateVerdicts = async () => {
    if (!id || isGenerating) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-section-verdicts', {
        body: { companyId: id },
      });

      if (error) throw error;

      if (data?.verdicts) {
        const formattedVerdicts: SectionVerdicts = {};
        Object.keys(data.verdicts).forEach((key) => {
          const scoreData = data.sections?.find((s: any) => s.name === key);
          formattedVerdicts[key] = {
            score: scoreData?.score || 0,
            maxScore: 20,
            verdict: data.verdicts[key],
            detailedScores: scoreData?.detailedScores || {},
          };
        });

        setSectionVerdicts(formattedVerdicts);

        // Parse overall assessment
        const assessment = data.overall_assessment || '';
        const points = assessment.split('\n').filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'));
        setOverallAssessment(points.map((p: string) => p.replace(/^[-•]\s*/, '').trim()));
      }
    } catch (error) {
      console.error('Error generating verdicts:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate analysis verdicts',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = useCallback(() => {
    navigate("/startup-dashboard");
  }, [navigate]);

  // Calculate score color (for 20-point scale)
  const getScoreColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    if (percentage >= 20) return "text-orange-600";
    return "text-red-600";
  };

  // Get badge color for score
  const getBadgeColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-emerald-600 text-white hover:bg-emerald-700";
    if (percentage >= 60) return "bg-blue-600 text-white hover:bg-blue-700";
    if (percentage >= 40) return "bg-amber-600 text-white hover:bg-amber-700";
    if (percentage >= 20) return "bg-orange-600 text-white hover:bg-orange-700";
    return "bg-red-600 text-white hover:bg-red-700";
  };

  // Get progress bar color
  const getProgressColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-amber-500";
    if (percentage >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  // Calculate percentage from score
  const getScorePercentage = (score: number, maxScore: number = 20) => {
    return Math.round((score / maxScore) * 100);
  };

  // Get score description
  const getScoreDescription = (score: number): string => {
    if (score >= 16) return `Excellent Potential (${Math.round(score)}/20): Outstanding startup with exceptional potential and strong fundamentals.`;
    if (score >= 12) return `Good Potential (${Math.round(score)}/20): Solid startup with good potential. Worth serious consideration.`;
    if (score >= 8) return `Average Potential (${Math.round(score)}/20): Decent fundamentals but areas need improvement.`;
    if (score >= 4) return `Below Average (${Math.round(score)}/20): Significant concerns exist. Requires improvement.`;
    return `Poor Prospect (${Math.round(score)}/20): Major deficiencies across multiple areas.`;
  };

  // Highlight numbers in assessment points
  const highlightNumbers = (text: string) => {
    return text.replace(/(\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?[KMBTkmbt]?|\d+(?:\.\d+)?[KMBTkmbt])/g, 
      (match) => `<span class="font-medium text-primary">${match}</span>`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const displayScore = company.overall_score;
  const formattedScore = Math.round(displayScore);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 -ml-2"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {company.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Score: <span className={`font-semibold ${getScoreColor(displayScore)}`}>
                    {formattedScore}/20
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Info Card */}
        <CompanyInfoCard
          website={company.website}
          stage={company.stage}
          industry={company.industry}
          introduction={company.introduction || company.description}
          companyName={company.name}
        />

        {/* Overall Assessment */}
        <Card className="mb-8 shadow-card border-0">
          <CardHeader className="bg-secondary/50 border-b pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Overall Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {isGenerating ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Generating AI analysis...</p>
              </div>
            ) : overallAssessment.length > 0 ? (
              <div className="space-y-3">
                {overallAssessment.map((point, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Detailed assessment will be generated shortly...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis from Evaluation */}
        {company.evaluation?.ai_analysis_summary && (
          <Card className="mb-8 shadow-card border-0">
            <CardHeader className="bg-secondary/50 border-b pb-4">
              <CardTitle className="text-xl font-semibold">AI Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {company.evaluation.ai_analysis_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        {company.evaluation?.ai_recommendations && (
          <Card className="mb-8 shadow-card border-0">
            <CardHeader className="bg-secondary/50 border-b pb-4">
              <CardTitle className="text-xl font-semibold">AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {company.evaluation.ai_recommendations}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Section Metrics */}
        {sectionVerdicts && Object.keys(sectionVerdicts).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-primary" />
              Section Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(sectionVerdicts).map(([sectionName, data]) => {
                const percentage = getScorePercentage(data.score, data.maxScore);
                return (
                  <Card
                    key={sectionName}
                    className="border-0 shadow-card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedSection({ name: sectionName, data })}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <CardTitle className="text-lg font-semibold">
                          {sectionName}
                        </CardTitle>
                        <Badge className={getBadgeColor(data.score, data.maxScore)}>
                          {data.score}/{data.maxScore}
                        </Badge>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                        <div 
                          className={`absolute top-0 left-0 h-2 rounded-full ${getProgressColor(data.score, data.maxScore)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {percentage}% Score
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {data.verdict}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Detail Dialog */}
        <Dialog open={!!selectedSection} onOpenChange={(open) => !open && setSelectedSection(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedSection?.name}</span>
                {selectedSection && (
                  <Badge className={getBadgeColor(selectedSection.data.score, selectedSection.data.maxScore)}>
                    {selectedSection.data.score}/{selectedSection.data.maxScore}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedSection && (
                <>
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Overall Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(selectedSection.data.score, selectedSection.data.maxScore)}`}>
                        {getScorePercentage(selectedSection.data.score, selectedSection.data.maxScore)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={getScorePercentage(selectedSection.data.score, selectedSection.data.maxScore)} 
                        className="h-3"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-3 rounded-full ${getProgressColor(selectedSection.data.score, selectedSection.data.maxScore)}`}
                        style={{ width: `${getScorePercentage(selectedSection.data.score, selectedSection.data.maxScore)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      AI Verdict
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedSection.data.verdict}
                    </p>
                  </div>

                  {selectedSection.data.detailedScores && Object.keys(selectedSection.data.detailedScores).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart2 className="h-5 w-5" />
                        Detailed Score Breakdown
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(selectedSection.data.detailedScores).map(([metric, score]) => {
                          const percentage = getScorePercentage(score as number, 20);
                          return (
                            <div key={metric} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{metric}</span>
                                <span className={`font-semibold ${getScoreColor(score as number, 20)}`}>
                                  {score}/20 ({percentage}%)
                                </span>
                              </div>
                              <div className="relative">
                                <Progress 
                                  value={percentage} 
                                  className="h-2"
                                />
                                <div 
                                  className={`absolute top-0 left-0 h-2 rounded-full ${getProgressColor(score as number, 20)}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CompanyPage;
