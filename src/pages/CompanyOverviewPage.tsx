
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Globe, Building, Users, Mail, TrendingUp, Layers, ExternalLink } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CompanyOverviewPage = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(companyId);
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    email: "",
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
        setInfoLoading(true);
        
        // First check company_details table
        const { data: companyDetails } = await supabase
          .from('company_details')
          .select('website, stage, industry, introduction')
          .eq('company_id', company.id)
          .maybeSingle();
        
        if (companyDetails) {
          setCompanyInfo({
            name: company.name,
            email: "",
            website: companyDetails.website || "",
            stage: companyDetails.stage || "Not specified",
            industry: companyDetails.industry || "Not specified",
            founderLinkedIns: [],
            introduction: companyDetails.introduction || "No description available."
          });
          setInfoLoading(false);
          return;
        }
        
        // Next check for public submission data
        if (company.reportId) {
          const { data: report } = await supabase
            .from('reports')
            .select('is_public_submission, submission_form_id, submitter_email')
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
                name: company.name,
                email: report.submitter_email || "",
                website: submission.website_url || "",
                stage: submission.company_stage || "Not specified",
                industry: submission.industry || "Not specified",
                founderLinkedIns: submission.founder_linkedin_profiles || [],
                introduction: submission.description || "No description available."
              });
              setInfoLoading(false);
              return;
            }
          }
          
          // If not from public submission, try to extract from sections
          const { data: sections } = await supabase
            .from('sections')
            .select('title, description')
            .eq('company_id', company.id);
          
          let intro = "No detailed information available for this company.";
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
            name: company.name,
            email: report.submitter_email || "",
            website: "",
            stage,
            industry,
            founderLinkedIns: [],
            introduction: intro
          });
        }
      } catch (error) {
        console.error("Error fetching company information:", error);
        toast({
          title: "Error loading company data",
          description: "Could not retrieve company information",
          variant: "destructive"
        });
      } finally {
        setInfoLoading(false);
      }
    }
    
    if (company) {
      fetchCompanyInfo();
    }
  }, [company, companyId]);

  const handleBackClick = () => {
    navigate(-1);
  };

  if (isLoading || infoLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-secondary rounded w-1/4"></div>
          <div className="h-12 bg-secondary rounded w-1/2"></div>
          <div className="h-32 bg-secondary rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-24 bg-secondary rounded"></div>
            <div className="h-24 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>Company not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 animate-fade-in">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackClick}
        className="mb-6"
      >
        <ChevronLeft className="mr-1" /> Back
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{companyInfo.name}</h1>
        <p className="text-muted-foreground mt-2">{companyInfo.industry} • {companyInfo.stage}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{companyInfo.introduction}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyInfo.website && (
              <div>
                <h3 className="text-sm font-medium">Website</h3>
                <a 
                  href={companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {companyInfo.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                Stage
              </h3>
              <p>{companyInfo.stage}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium flex items-center gap-1">
                <Layers className="h-4 w-4 text-primary" />
                Industry
              </h3>
              <p>{companyInfo.industry}</p>
            </div>
            
            {companyInfo.email && (
              <div>
                <h3 className="text-sm font-medium flex items-center gap-1">
                  <Mail className="h-4 w-4 text-primary" />
                  Contact Email
                </h3>
                <a 
                  href={`mailto:${companyInfo.email}`}
                  className="text-primary hover:underline"
                >
                  {companyInfo.email}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {companyInfo.founderLinkedIns.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Founding Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyInfo.founderLinkedIns.map((linkedin, index) => (
                <Card key={index} className="overflow-hidden shadow-sm border-0">
                  <CardContent className="p-4">
                    <h3 className="font-medium">Founder {index + 1}</h3>
                    <a 
                      href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      LinkedIn Profile
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompanyOverviewPage;
