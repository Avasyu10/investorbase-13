
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, Info } from "lucide-react";
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
}

export function CompanyInfoCard({
  website = "",
  stage = "",
  industry = "",
  founderLinkedIns = [],
  introduction = "",
  description, // For backward compatibility
  pitchUrl,    // For backward compatibility
  reportId,     // For backward compatibility
  companyName = "this company",
  companyLinkedInUrl
}: CompanyInfoProps) {
  const { id } = useParams<{ id: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use introduction or description (for backward compatibility)
  const displayIntroduction = introduction || description || "";

  // Format website URL for display and linking
  const displayWebsite = website && website.trim() !== "" 
    ? website.replace(/^https?:\/\/(www\.)?/, '') 
    : "";
  
  const websiteUrl = website && website.trim() !== "" 
    ? (website.startsWith('http') ? website : `https://${website}`)
    : null;

  // Display stage and industry with proper handling of empty values
  const displayStage = stage && stage.trim() !== "" ? stage : "";
  const displayIndustry = industry && industry.trim() !== "" ? industry : "";

  // First, get the company data from the companies table to ensure we have the correct company ID
  const { data: companyData } = useQuery({
    queryKey: ['company-data', id],
    queryFn: async () => {
      if (!id) return null;
      
      console.log("Fetching company data for ID:", id);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
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

  // Show the "More Information" button for all analyzed companies
  // (companies that exist in the database and have been analyzed)
  const shouldShowMoreInfoButton = !!companyData?.id;

  const handleMoreInformation = () => {
    setDialogOpen(true);
  };

  // Create a proper fallback introduction if none is provided
  const finalIntroduction = displayIntroduction || 
    `${companyData?.name || companyName} is a company in our portfolio. Detailed information about their business model, market opportunity, and growth strategy is available through their pitch deck analysis.`;

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          {/* Company Description with More Information Button */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">About {companyData?.name || companyName}</h4>
              {shouldShowMoreInfoButton && (
                <Button
                  variant="outline"
                  onClick={handleMoreInformation}
                  className="h-8 px-4"
                >
                  <Info className="mr-2 h-4 w-4" />
                  More Information
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {finalIntroduction}
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
                <p className="text-sm text-muted-foreground">
                  {displayStage || "Not specified"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">
                  {displayIndustry || "Not specified"}
                </p>
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
    </div>
  );
}
