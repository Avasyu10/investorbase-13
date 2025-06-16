
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, Info, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCompanyScraping } from "@/hooks/useCompanyScraping";

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
  const { scrapeData, scrapeMutation, hasLinkedInUrl, isScrapingInProgress } = useCompanyScraping(id || "");

  // Use introduction or description (for backward compatibility)
  const displayIntroduction = introduction || description || "No detailed information available for this company.";

  // Format website URL for display and linking
  const displayWebsite = website && website !== "https://example.com" 
    ? website.replace(/^https?:\/\/(www\.)?/, '') 
    : "Not available";
  
  const websiteUrl = website && website !== "https://example.com" 
    ? (website.startsWith('http') ? website : `https://${website}`)
    : null;

  const handleMoreInformation = () => {
    scrapeMutation.mutate();
  };

  // Check if LinkedIn scraping already exists for this company
  const { data: existingScrape } = useQuery({
    queryKey: ['company-linkedin-scrape', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('company_id', id)
        .eq('status', 'completed')
        .maybeSingle();

      if (error) {
        console.error('Error checking existing scrape:', error);
        return null;
      }

      return data;
    },
    enabled: !!id,
  });

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Company Overview
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          {/* Company Description */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">About {companyName}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {displayIntroduction}
            </p>
          </div>
          
          {/* Show scraped LinkedIn data if available */}
          {scrapeData?.status === 'completed' && scrapeData.scraped_data && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-3">Additional Company Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {scrapeData.scraped_data.employees_count && (
                  <div>
                    <span className="font-medium">Employees:</span> {scrapeData.scraped_data.employees_count}
                  </div>
                )}
                {scrapeData.scraped_data.location && (
                  <div>
                    <span className="font-medium">Location:</span> {scrapeData.scraped_data.location}
                  </div>
                )}
                {scrapeData.scraped_data.founded_year && (
                  <div>
                    <span className="font-medium">Founded:</span> {scrapeData.scraped_data.founded_year}
                  </div>
                )}
                {scrapeData.scraped_data.description && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-muted-foreground">{scrapeData.scraped_data.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
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
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{industry}</p>
                  {hasLinkedInUrl && !scrapeData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMoreInformation}
                      disabled={isScrapingInProgress}
                      className="h-6 px-2 text-xs"
                    >
                      {isScrapingInProgress ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Info className="mr-1 h-3 w-3" />
                          More Information
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
