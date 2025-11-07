import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Info, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStartupCompanyDetails } from "@/hooks/useStartupCompanyDetails";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { CompanyScrapingDialog } from "@/components/companies/CompanyScrapingDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { StartupSectionMetrics } from "@/components/companies/StartupSectionMetrics";
import { useState } from "react";

const StartupCompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useStartupCompanyDetails(id || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formResponsesOpen, setFormResponsesOpen] = useState(false);

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
  
  // Use raw score (0-20 scale) to match StartupDashboard display
  const displayScore = company.overall_score;

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-0 pb-6 animate-fade-in">
        {/* Back Button and Form Responses Button */}
        <div className="container mx-auto mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/startup-dashboard")} 
            className="flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back to Dashboard
          </Button>
          
          {company && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFormResponsesOpen(true)}
              className="flex items-center bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Form Responses
            </Button>
          )}
        </div>

        {/* Company Overview - Full width */}
        <div className="w-full mb-8">
          <div className="container mx-auto">
            {/* Custom header for Company Overview with More Information button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">
                {company.name}
              </h3>
              {company && (
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(true)}
                  className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
                >
                  <Info className="mr-2 h-4 w-4" />
                  More Information
                </Button>
              )}
            </div>
            
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

          {/* Real-Time Market Research */}
          {company.id && (
            <MarketResearch 
              companyId={company.id} 
              assessmentPoints={company.assessment_points || []} 
            />
          )}

          {/* Section Metrics */}
          <StartupSectionMetrics 
            submissionId={company.id}
          />
        </div>
        
        {/* Company Scraping Dialog for More Information */}
        {company && (
          <CompanyScrapingDialog 
            companyId={company.id} 
            companyName={company.name} 
            open={dialogOpen} 
            onOpenChange={setDialogOpen} 
          />
        )}
        
        {/* Form Responses Dialog */}
        {company && company._rawSubmission && (
          <Dialog open={formResponsesOpen} onOpenChange={setFormResponsesOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-slate-900 border-slate-700">
              <DialogHeader className="border-b border-slate-700 pb-4">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6 text-amber-400" />
                  Startup Form Responses
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="h-[75vh] pr-4">
                <div className="space-y-6 py-4">
                  {/* Company ID and Date */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-blue-400">{company.name}</h3>
                    <p className="text-sm text-slate-400">
                      Date: {new Date(company._rawSubmission.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Problem Statement */}
                  {company._rawSubmission.problem_statement && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold text-white">
                        Q1: What problem is your venture targeting to solve? How are the affected people (customers/consumers) coping with the problem at present?
                      </h4>
                      <p className="text-slate-300">{company._rawSubmission.problem_statement}</p>
                    </div>
                  )}

                  {/* Target Customers */}
                  {(company._rawSubmission as any).customer_understanding && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold text-white">
                        Q2: What is the intended customer segment or target customers of your venture?
                      </h4>
                      <p className="text-slate-300">{(company._rawSubmission as any).customer_understanding}</p>
                    </div>
                  )}

                  {/* Competitors */}
                  {(company._rawSubmission as any).competition && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold text-white">
                        Q3: Who are your current competitors? (Please mention both direct and indirect competitors if applicable)
                      </h4>
                      <p className="text-slate-300">{(company._rawSubmission as any).competition}</p>
                    </div>
                  )}

                  {/* Solution */}
                  {company._rawSubmission.solution && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold text-white">
                        Q4: How will your venture generate revenue? What are the factors affecting your costs and revenues? Also highlight any growth opportunities in future.
                      </h4>
                      <p className="text-slate-300">{company._rawSubmission.solution}</p>
                    </div>
                  )}

                  {/* Market Understanding */}
                  {(company._rawSubmission as any).market_understanding && (
                    <div className="space-y-2 border-l-4 border-amber-400 pl-4">
                      <h4 className="font-semibold text-white">
                        Q5: How does your idea and marketing strategy differentiate your startup from your competitors and help you sustain in the market?
                      </h4>
                      <p className="text-slate-300">{(company._rawSubmission as any).market_understanding}</p>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                    <div>
                      <h3 className="font-semibold mb-1 text-sm text-slate-200">Founder Email</h3>
                      <p className="text-sm text-slate-400">{company._rawSubmission.founder_email}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-sm text-slate-200">Campus Affiliation</h3>
                      <p className="text-sm text-slate-400">
                        {company._rawSubmission.campus_affiliation ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default StartupCompanyPage;
