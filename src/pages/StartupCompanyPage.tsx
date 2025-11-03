import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStartupCompanyDetails } from "@/hooks/useStartupCompanyDetails";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { OverallAssessment } from "@/components/companies/OverallAssessment";

const StartupCompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useStartupCompanyDetails(id || "");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Submission Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The startup submission you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/startup-dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const websiteToShow = company.website || "";
  const stageToShow = company.stage || "Early Stage";
  const industryToShow = company.industry || "Not specified";
  const introductionToShow = company.introduction || `${company.name} is an innovative startup. View their detailed evaluation below.`;
  
  // Convert score to 100-point scale for display
  const displayScore = company.overall_score > 5 ? company.overall_score : company.overall_score * 20;

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-0 pb-6 animate-fade-in">
        {/* Back Button */}
        <div className="container mx-auto mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/startup-dashboard")} 
            className="flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back to Dashboard
          </Button>
        </div>

        {/* Company Overview - Full width */}
        <div className="w-full mb-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-4">
                <CompanyInfoCard 
                  website={websiteToShow} 
                  stage={stageToShow} 
                  industry={industryToShow} 
                  introduction={introductionToShow} 
                  companyName={company.name} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto">
          {/* Overall Assessment */}
          <OverallAssessment 
            score={displayScore} 
            assessmentPoints={company.assessment_points || []} 
            companyId={company.id} 
            companyName={company.name} 
          />

          {/* Evaluation Details Section */}
          {company._rawEvaluation && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Detailed Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Problem Clarity */}
                  {(company._rawEvaluation as any).problem_clarity_score && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Problem Clarity</h3>
                      <div className="text-2xl font-bold text-primary">
                        {(company._rawEvaluation as any).problem_clarity_score}/20
                      </div>
                      {(company._rawEvaluation as any).problem_clarity_feedback && (
                        <p className="text-sm text-muted-foreground">
                          {(company._rawEvaluation as any).problem_clarity_feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Market Understanding */}
                  {(company._rawEvaluation as any).market_understanding_score && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Market Understanding</h3>
                      <div className="text-2xl font-bold text-primary">
                        {(company._rawEvaluation as any).market_understanding_score}/20
                      </div>
                      {(company._rawEvaluation as any).market_understanding_feedback && (
                        <p className="text-sm text-muted-foreground">
                          {(company._rawEvaluation as any).market_understanding_feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Solution Quality */}
                  {(company._rawEvaluation as any).solution_quality_score && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Solution Quality</h3>
                      <div className="text-2xl font-bold text-primary">
                        {(company._rawEvaluation as any).solution_quality_score}/20
                      </div>
                      {(company._rawEvaluation as any).solution_quality_feedback && (
                        <p className="text-sm text-muted-foreground">
                          {(company._rawEvaluation as any).solution_quality_feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Team Capability */}
                  {(company._rawEvaluation as any).team_capability_score && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Team Capability</h3>
                      <div className="text-2xl font-bold text-primary">
                        {(company._rawEvaluation as any).team_capability_score}/20
                      </div>
                      {(company._rawEvaluation as any).team_capability_feedback && (
                        <p className="text-sm text-muted-foreground">
                          {(company._rawEvaluation as any).team_capability_feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Traction */}
                  {(company._rawEvaluation as any).traction_score && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Traction</h3>
                      <div className="text-2xl font-bold text-primary">
                        {(company._rawEvaluation as any).traction_score}/20
                      </div>
                      {(company._rawEvaluation as any).traction_feedback && (
                        <p className="text-sm text-muted-foreground">
                          {(company._rawEvaluation as any).traction_feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Overall Feedback */}
                {(company._rawEvaluation as any).overall_feedback && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Overall Feedback</h3>
                    <p className="text-sm">{(company._rawEvaluation as any).overall_feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submission Details */}
          {company._rawSubmission && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company._rawSubmission.problem_statement && (
                  <div>
                    <h3 className="font-semibold mb-2">Problem Statement</h3>
                    <p className="text-muted-foreground">{company._rawSubmission.problem_statement}</p>
                  </div>
                )}
                
                {company._rawSubmission.solution && (
                  <div>
                    <h3 className="font-semibold mb-2">Solution</h3>
                    <p className="text-muted-foreground">{company._rawSubmission.solution}</p>
                  </div>
                )}

                {(company._rawSubmission as any).market_understanding && (
                  <div>
                    <h3 className="font-semibold mb-2">Market Understanding</h3>
                    <p className="text-muted-foreground">{(company._rawSubmission as any).market_understanding}</p>
                  </div>
                )}

                {(company._rawSubmission as any).customer_understanding && (
                  <div>
                    <h3 className="font-semibold mb-2">Customer Understanding</h3>
                    <p className="text-muted-foreground">{(company._rawSubmission as any).customer_understanding}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">Founder Email</h3>
                    <p className="text-muted-foreground text-sm">{company._rawSubmission.founder_email}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">Campus Affiliation</h3>
                    <p className="text-muted-foreground text-sm">
                      {company._rawSubmission.campus_affiliation ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupCompanyPage;
