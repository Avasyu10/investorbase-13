
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

interface BarcSubmission {
  id: string;
  company_linkedin_url: string | null;
}

export function CompanyInfoCard({
  website = "https://example.com",
  stage = "Not specified",
  industry = "Not specified",
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

  // Use introduction or description (for backward compatibility)
  const displayIntroduction = introduction || description || "No detailed information available for this company.";

  // Format website URL for display and linking
  const displayWebsite = website && website !== "https://example.com" 
    ? website.replace(/^https?:\/\/(www\.)?/, '') 
    : "Not available";
  
  const websiteUrl = website && website !== "https://example.com" 
    ? (website.startsWith('http') ? website : `https://${website}`)
    : null;

  // Fetch BARC submission to get the LinkedIn URL
  const { data: barcSubmission } = useQuery({
    queryKey: ['barc-submission', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('id, company_linkedin_url')
        .eq('company_id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BARC submission:', error);
        return null;
      }

      return data as BarcSubmission | null;
    },
    enabled: !!id,
  });

  // Check if we have scraped data available
  const { data: scrapeData } = useQuery({
    queryKey: ['company-scrape', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('company_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company scrape data:', error);
        return null;
      }

      return data;
    },
    enabled: !!id,
  });

  const hasLinkedInUrl = !!barcSubmission?.company_linkedin_url;
  const hasScrapedData = scrapeData?.scraped_data;

  const handleMoreInformation = () => {
    setDialogOpen(true);
  };

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
              <h4 className="font-medium">About {companyName}</h4>
              {(hasLinkedInUrl || hasScrapedData) && (
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
                <p className="text-sm text-muted-foreground">{stage}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{industry}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Scraping Dialog */}
      {id && (
        <CompanyScrapingDialog
          companyId={id}
          companyName={companyName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
