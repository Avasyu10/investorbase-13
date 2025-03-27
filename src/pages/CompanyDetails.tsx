
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { ScoreAssessment } from "@/components/companies/ScoreAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { useAuth } from "@/hooks/useAuth";
import { sections } from "@/lib/companyData";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { LatestResearch } from "@/components/companies/LatestResearch";

import { supabase } from "@/integrations/supabase/client";

function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { company, isLoading, error } = useCompanyDetails(id || "");

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

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center"
      >
        <ChevronLeft className="mr-1" /> Back
      </Button>

      {/* Company Info and Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <CompanyInfoCard
            name={company.name}
            description={company.description || "No description available"}
            pitchUrl={company.pitchUrl}
            reportId={company.reportId}
          />
        </div>
        <div>
          <ScoreAssessment 
            overallScore={company.overallScore.toString()} 
            sections={company.sections || []} 
          />
        </div>
      </div>

      {/* Fund Thesis Alignment */}
      <FundThesisAlignment companyId={company.id} />

      {/* Market Research */}
      <MarketResearch companyId={company.id} assessmentPoints={company.assessmentPoints || []} />

      {/* Overall Assessment */}
      <OverallAssessment
        companyName={company.name}
        assessmentPoints={company.assessmentPoints || []}
      />

      {/* Latest Research */}
      <LatestResearch companyId={company.id} />

      {/* Sections */}
      <h2 className="text-2xl font-bold mt-12 mb-6">Detailed Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {company.sections &&
          company.sections.map((section) => (
            <SectionCard
              key={section.id}
              id={section.id}
              title={section.title}
              type={section.type}
              score={section.score}
              description={section.description || ""}
              strengthsCount={section.strengthsCount || 0}
              weaknessesCount={section.weaknessesCount || 0}
              companyId={company.id}
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
  );
}

export default CompanyDetails;
