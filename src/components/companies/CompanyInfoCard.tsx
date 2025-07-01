
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, Info, Bot } from "lucide-react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CompanyScrapingDialog } from "./CompanyScrapingDialog";
import { CompanyChatbotDialog } from "./CompanyChatbotDialog";
import { Company, AnalysisResult } from "@/lib/api/apiContract";

type CompanyInfoProps = {
  website?: string;
  stage?: string;
  industry?: string;
  founderLinkedIns?: string[];
  introduction?: string;
  description?: string; // Added for backward compatibility
  pitchUrl?: string; // Added for backward compatibility
  reportId?: string; // Added for backward compatibility
  companyName?: string; // Added to display company name in description
  companyLinkedInUrl?: string; // Added for LinkedIn scraping
};



export function CompanyInfoCard({
  website = "",
  stage = "",
  industry = "",
  founderLinkedIns = [],
  introduction = "No detailed information available for this company.",
  description,
  // For backward compatibility
  pitchUrl,
  // For backward compatibility
  reportId,
  // For backward compatibility
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
        .select('id, name, report_id, response_received')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching company data:', error);
        return null;
      }
      console.log("Company data fetched:", data);
      return data as Company;
    },
    enabled: !!id
  });

  // Parse response_received data if available
  const responseReceivedData = companyData?.response_received ? (() => {
    try {
      return JSON.parse(companyData.response_received);
    } catch (error) {
      console.error('Error parsing response_received JSON:', error);
      return null;
    }
  })() : null;

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
    enabled: !!companyData?.report_id
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
    enabled: !!companyData?.id
  });

  // Prioritize data sources: response_received, then analysis data, then props
  const analysisCompanyInfo = analysisData?.companyInfo;
  const displayIntroduction = responseReceivedData?.description || analysisCompanyInfo?.description || introduction || description || "No detailed information available for this company.";

  // Format website URL for display and linking - prioritize response_received data
  const prioritizedWebsite = responseReceivedData?.website || analysisCompanyInfo?.website || website;
  const displayWebsite = prioritizedWebsite && prioritizedWebsite !== "" ? prioritizedWebsite.replace(/^https?:\/\/(www\.)?/, '') : "Not available";
  const websiteUrl = prioritizedWebsite && prioritizedWebsite !== "" ? prioritizedWebsite.startsWith('http') ? prioritizedWebsite : `https://${prioritizedWebsite}` : null;

  // Display stage and industry with prioritized data sources
  const displayStage = responseReceivedData?.stage || analysisCompanyInfo?.stage || stage || "Not specified";
  const displayIndustry = responseReceivedData?.industry || analysisCompanyInfo?.industry || industry || "Not specified";

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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Company Overview
        </h3>
        {shouldShowMoreInfoButton && (
          <Button
            variant="outline"
            onClick={handleChatbot}
            size="sm"
            className="h-10 w-10 p-0 bg-amber-400 hover:bg-amber-300 text-slate-950"
          >
            <Bot className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          {/* Company Description with More Information Button */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">About {companyData?.name || companyName}</h4>
              {shouldShowMoreInfoButton && (
                <Button variant="outline" onClick={handleMoreInformation} className="h-8 px-4">
                  <Info className="mr-2 h-4 w-4" />
                  More Information
                </Button>
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

      {/* Company Chatbot Dialog */}
      {companyData?.id && chatbotOpen && (
        <CompanyChatbotDialog
          companyId={companyData.id}
          companyName={companyData.name || companyName}
          companyIntroduction={displayIntroduction}
          companyIndustry={displayIndustry}
          companyStage={displayStage}
          assessmentPoints={analysisData?.assessmentPoints || []}
          open={chatbotOpen}
          onOpenChange={setChatbotOpen}
        />
      )}
    </div>
  );
}
