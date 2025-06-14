
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { ScoreAssessment } from "@/components/companies/ScoreAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { CompanyLinkedInInfo } from "@/components/companies/CompanyLinkedInInfo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Loader2, BarChart2 } from "lucide-react";
import useCompanyDetails from "@/hooks/companyHooks/useCompanyDetails";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { company, isLoading } = useCompanyDetails(id || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company && !isLoading) {
      setError("Company not found");
    }
  }, [company, isLoading]);

  // Early return for loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Early return for error state
  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Ensure we have values to display, using empty strings if properties are undefined
  const websiteToShow = company.website || "";
  const stageToShow = company.stage || "";
  const industryToShow = company.industry || "";
  const introductionToShow = company.introduction || "";

  return (
    <div className="h-screen flex flex-col">
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-4 pt-0 pb-6 animate-fade-in">
          {/* Back Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>

          {/* Combined Company Overview and Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <CompanyInfoCard
                website={websiteToShow}
                stage={stageToShow}
                industry={industryToShow}
                introduction={introductionToShow}
                companyName={company.name}
              />
            </div>
            <div>
              <ScoreAssessment company={company} />
            </div>
          </div>

          {/* Company LinkedIn Information */}
          <CompanyLinkedInInfo companyId={company.id} companyName={company.name} />

          {/* Overall Assessment */}
          <OverallAssessment
            score={company.overallScore || 0}
            assessmentPoints={company.assessmentPoints || []}
          />

          {/* Sections */}
          <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Detailed Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {company.sections &&
              company.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onClick={() => navigate(`/company/${company.id}/section/${section.id}`)}
                />
              ))}
            {(!company.sections || company.sections.length === 0) && (
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>No Analysis Sections Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    There are no detailed analysis sections available for this company.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default CompanyDetails;
