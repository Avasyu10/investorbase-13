
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, Info, MessageCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CompanyScrapingDialog } from "./CompanyScrapingDialog";

type CompanyInfoProps = {
  website?: string;
  stage?: string;
  industry?: string;
  founderLinkedIns?: string[];
  introduction?: string;
  description?: string; // Added for backward compatibility
  pitchUrl?: string;    // Added for backward compatibility
  reportId?: string;    // Added for backward compatibility
  companyName?: string; // Added to display company name in description
  companyLinkedInUrl?: string; // Added for LinkedIn scraping
};

interface Company {
  id: string;
  name: string;
  report_id?: string;
}

interface AnalysisResult {
  companyInfo?: {
    stage: string;
    industry: string;
    website: string;
    description: string;
  };
  [key: string]: any;
}

export function CompanyInfoCard({
  website = "",
  stage = "",
  industry = "",
  founderLinkedIns = [],
  introduction = "No detailed information available for this company.",
  description, // For backward compatibility
  pitchUrl,    // For backward compatibility
  reportId,     // For backward compatibility
  companyName = "this company",
  companyLinkedInUrl
}: CompanyInfoProps) {
  const { id } = useParams<{ id: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // First, get the company data from the companies table to ensure we have the correct company ID
  const { data: companyData } = useQuery({
    queryKey: ['company-data', id],
    queryFn: async () => {
      if (!id) return null;
      
      console.log("Fetching company data for ID:", id);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, report_id')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching company data:', error);
        return null;
      }

      console.log("Company data fetched:", data);
      return data as Company;
    },
    enabled: !!id,
  });

  // Fetch PDF analysis data from the report to get company info
  const { data: analysisData } = useQuery({
    queryKey: ['analysis-company-info', companyData?.report_id],
    queryFn: async () => {
      if (!companyData?.report_id) return null;
      
      console.log("Fetching analysis data for report ID:", companyData.report_id);
      const { data, error } = await supabase
        .from('reports')
        .select('analysis_result')
        .eq('id', companyData.report_id)
        .single();

      if (error) {
        console.error('Error fetching analysis data:', error);
        return null;
      }

      console.log("Analysis data fetched:", data);
      return data?.analysis_result as AnalysisResult;
    },
    enabled: !!companyData?.report_id,
  });

  // Now fetch BARC submission using the company ID from the companies table
  const { data: barcSubmission } = useQuery({
    queryKey: ['barc-submission', companyData?.id],
    queryFn: async () => {
      if (!companyData?.id) return null;
      
      console.log("Fetching BARC submission for company ID:", companyData.id);
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('id, company_linkedin_url')
        .eq('company_id', companyData.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BARC submission:', error);
        return null;
      }

      console.log("BARC submission data:", data);
      return data;
    },
    enabled: !!companyData?.id,
  });

  // Use analysis data first, then fallback to props
  const analysisCompanyInfo = analysisData?.companyInfo;
  
  const displayIntroduction = analysisCompanyInfo?.description || introduction || description || "No detailed information available for this company.";
  
  // Format website URL for display and linking - prioritize analysis data
  const analysisWebsite = analysisCompanyInfo?.website || website;
  const displayWebsite = analysisWebsite && analysisWebsite !== "" 
    ? analysisWebsite.replace(/^https?:\/\/(www\.)?/, '') 
    : "Not available";
  
  const websiteUrl = analysisWebsite && analysisWebsite !== "" 
    ? (analysisWebsite.startsWith('http') ? analysisWebsite : `https://${analysisWebsite}`)
    : null;

  // Display stage and industry with analysis data priority
  const displayStage = analysisCompanyInfo?.stage || stage || "Not specified";
  const displayIndustry = analysisCompanyInfo?.industry || industry || "Not specified";

  // Show the "More Information" button for all analyzed companies
  const shouldShowMoreInfoButton = !!companyData?.id;

  const handleMoreInformation = () => {
    setDialogOpen(true);
  };

  const handleChatbot = () => {
    setChatbotOpen(true);
  };

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          {/* Company Description with More Information and Chatbot Buttons */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">About {companyData?.name || companyName}</h4>
              {shouldShowMoreInfoButton && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleChatbot}
                    className="h-8 px-4"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chatbot
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMoreInformation}
                    className="h-8 px-4"
                  >
                    <Info className="mr-2 h-4 w-4" />
                    More Information
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {displayIntroduction}
            </p>
          </div>
          
          {/* Company Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Website</p>
                {websiteUrl ? (
                  <a 
                    href={websiteUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline truncate block"
                  >
                    {displayWebsite}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Stage</p>
                <p className="text-sm text-muted-foreground">{displayStage}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{displayIndustry}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Scraping Dialog */}
      {companyData?.id && (
        <CompanyScrapingDialog
          companyId={companyData.id}
          companyName={companyData.name || companyName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}

      {/* TODO: Add Chatbot Dialog when chatbotOpen is true */}
      {chatbotOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Company Chatbot</h3>
            <p className="text-sm text-muted-foreground mb-4">Chatbot functionality will be implemented here.</p>
            <Button onClick={() => setChatbotOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
