import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BarChart2, Lightbulb } from "lucide-react";
import { useStartupDetails } from "@/hooks/useStartupDetails";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { SectionCard } from "@/components/companies/SectionCard";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useStartupDetails(id);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = useCallback(() => {
    navigate("/startup-dashboard");
  }, [navigate]);

  const handleSectionClick = useCallback((sectionId: number | string) => {
    // For now, just log - can implement section detail view later
    console.log("Section clicked:", sectionId);
  }, []);

  // Calculate score color
  const getScoreColor = (score: number) => {
    if (score >= 16) return "text-emerald-600";
    if (score >= 12) return "text-blue-600";
    if (score >= 8) return "text-amber-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
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
            {company.assessment_points && company.assessment_points.length > 0 ? (
              <div className="space-y-3">
                {company.assessment_points.map((point, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p 
                      className="text-sm text-muted-foreground" 
                      dangerouslySetInnerHTML={{ __html: highlightNumbers(point) }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {company.enrichment ? "Generating detailed assessment..." : "Detailed assessment will be generated shortly..."}
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

        {/* Sections */}
        {company.sections && company.sections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Detailed Analysis</h2>
            {company.sections.map((section: any) => (
              <SectionCard
                key={section.id}
                section={section}
                onClick={() => handleSectionClick(section.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyPage;
