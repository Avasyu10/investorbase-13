
import { useParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "./SectionCard";
import { ScoreAssessment } from "./ScoreAssessment";
import { LatestResearch } from "./LatestResearch";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, BarChart2, Files } from "lucide-react";
import { useEffect, useState } from "react";
import { useCompanyDetails } from "@/hooks/useCompanies";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function CompanyDetails() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company, isLoading } = useCompanyDetails(companyId);
  const [hasResearchUpdated, setHasResearchUpdated] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    website: "",
    stage: "",
    industry: "",
    founderLinkedIns: [] as string[],
    introduction: ""
  });
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyInfo() {
      if (!company || !company.id) return;
      
      try {
        // First check if there are company details available
        const { data: companyDetails } = await supabase
          .from('company_details')
          .select('website, stage, industry, introduction')
          .eq('company_id', company.id)
          .maybeSingle();
        
        if (companyDetails) {
          console.log('Found company details:', companyDetails);
          
          // Company details from the AI extraction are available
          setCompanyInfo({
            website: companyDetails.website || "",
            stage: companyDetails.stage || "Not specified",
            industry: companyDetails.industry || "Not specified",
            founderLinkedIns: [],
            introduction: companyDetails.introduction || "No description available."
          });
          setInfoLoading(false);
          return;
        }
        
        // If no company details, use the original flow
        if (company.reportId) {
          const { data: report } = await supabase
            .from('reports')
            .select('is_public_submission, submission_form_id')
            .eq('id', company.reportId)
            .single();
          
          if (report?.is_public_submission) {
            const { data: submission } = await supabase
              .from('public_form_submissions')
              .select('website_url, company_stage, industry, founder_linkedin_profiles, description')
              .eq('report_id', company.reportId)
              .single();
            
            if (submission) {
              setCompanyInfo({
                website: submission.website_url || "",
                stage: submission.company_stage || "Not specified",
                industry: submission.industry || "Not specified",
                founderLinkedIns: submission.founder_linkedin_profiles || [],
                introduction: submission.description || "No description available."
              });
            }
          } else {
            const { data: sections } = await supabase
              .from('sections')
              .select('title, description')
              .eq('company_id', companyId);
            
            let intro = "";
            let industry = "Not specified";
            let stage = "Not specified";
            
            sections?.forEach(section => {
              const title = section.title.toLowerCase();
              const description = section.description || "";
              
              if (title.includes('company') || title.includes('introduction') || title.includes('about')) {
                intro = description;
              }
              
              if (description.toLowerCase().includes('industry')) {
                const industryMatch = description.match(/industry.{0,5}:?\s*([^\.]+)/i);
                if (industryMatch && industryMatch[1]) {
                  industry = industryMatch[1].trim();
                }
              }
              
              if (description.toLowerCase().includes('stage')) {
                const stageMatch = description.match(/stage.{0,5}:?\s*([^\.]+)/i);
                if (stageMatch && stageMatch[1]) {
                  stage = stageMatch[1].trim();
                }
              }
            });
            
            setCompanyInfo({
              website: "",
              stage,
              industry,
              founderLinkedIns: [],
              introduction: intro || "No detailed information available for this company."
            });
          }
        }
      } catch (error) {
        console.error("Error fetching company information:", error);
      } finally {
        setInfoLoading(false);
      }
    }
    
    if (company) {
      fetchCompanyInfo();
    }
  }, [company, companyId]);

  const handleSectionClick = (sectionId: number | string) => {
    navigate(`/company/${companyId}/section/${sectionId}`);
  };

  const navigateToReport = () => {
    if (company?.reportId) {
      console.log('Navigating to report:', company.reportId);
      navigate(`/reports/${company.reportId}`);
    } else {
      toast({
        title: "No report available",
        description: "This company doesn't have an associated report",
        variant: "destructive"
      });
    }
  };

  const navigateToSupplementaryMaterials = () => {
    navigate(`/company/${companyId}/supplementary`);
  };

  const onResearchFetched = () => {
    console.log("Research fetched successfully, invalidating company query");
    setHasResearchUpdated(true);
    queryClient.invalidateQueries({
      queryKey: ['company', companyId],
    });
  };

  useEffect(() => {
    if (hasResearchUpdated && company?.perplexityResponse) {
      setHasResearchUpdated(false);
    }
  }, [company?.perplexityResponse, hasResearchUpdated]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3"></div>
          <div className="h-6 bg-secondary rounded w-1/2"></div>
          
          <Card className="mb-8 border-0 shadow-subtle">
            <CardContent className="p-6">
              <div className="h-6 bg-secondary rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-full"></div>
                <div className="h-4 bg-secondary rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
          
          <div className="h-6 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-secondary rounded shadow-subtle"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Company not found</p>
      </div>
    );
  }

  const formattedScore = company ? parseFloat(company.overallScore.toFixed(1)) : 0;
  
  const progressPercentage = formattedScore * 20;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "score-excellent";
    if (score >= 3.5) return "score-good";
    if (score >= 2.5) return "score-average";
    if (score >= 1.5) return "score-poor";
    return "score-critical";
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      <div className="mb-7 sm:mb-9">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{company.name}</h1>
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            {company.reportId && (
              <Button 
                onClick={navigateToReport} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Deck
              </Button>
            )}
            <Button 
              onClick={navigateToSupplementaryMaterials} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Files className="h-4 w-4" />
              Supplementary Material
            </Button>
            <div className="flex items-center">
              <span className="text-xl sm:text-2xl font-bold text-primary mr-3">
                {formattedScore}
              </span>
              <span className="text-sm text-muted-foreground">/5</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 mb-8">
          <CompanyInfoCard 
            website={companyInfo.website}
            stage={companyInfo.stage}
            industry={companyInfo.industry}
            founderLinkedIns={companyInfo.founderLinkedIns}
            introduction={companyInfo.introduction}
          />
        </div>
        
        <div className="mb-5">
          <Progress 
            value={progressPercentage} 
            className={`h-2 ${getScoreColor(company.overallScore)}`} 
          />
        </div>

        <ScoreAssessment company={company} />
      </div>
      
      <LatestResearch 
        companyId={company.id.toString()} 
        assessmentPoints={company.assessmentPoints || []}
        existingResearch={company.perplexityResponse}
        requestedAt={company.perplexityRequestedAt}
        onSuccess={onResearchFetched}
      />
      
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-5 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        Section Metrics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {company.sections.map((section) => (
          <SectionCard 
            key={section.id} 
            section={section} 
            onClick={() => handleSectionClick(section.id)} 
          />
        ))}
      </div>
    </div>
  );
}
