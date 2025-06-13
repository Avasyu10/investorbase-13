
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface CompanyLinkedInInfoProps {
  companyId: string;
  companyName: string;
}

interface ScrapedData {
  content?: string;
  profileData?: any;
  [key: string]: any;
}

export const CompanyLinkedInInfo = ({ companyId, companyName }: CompanyLinkedInInfoProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Fetch company LinkedIn scrape data from company_scrapes table
  const { data: linkedinData, isLoading, error } = useQuery({
    queryKey: ['company-scrapes', companyId],
    queryFn: async () => {
      console.log('Fetching company scrapes for company ID:', companyId);
      
      // Fetch the LinkedIn scrape data from company_scrapes table
      const { data: allScrapes, error: allScrapesError } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (allScrapesError) {
        console.error('Error fetching all company scrapes:', allScrapesError);
        return null;
      }

      // Find scrape that looks like a company URL (contains /company/)
      const companyScrape = allScrapes?.find(scrape => 
        scrape.linkedin_url && scrape.linkedin_url.includes('/company/')
      );

      console.log('Company scrape data found:', companyScrape);
      return companyScrape;
    },
    enabled: !!companyId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Show loading state
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Company LinkedIn Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-secondary rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if there's an error
  if (error) {
    console.error('Error loading LinkedIn data:', error);
    return null;
  }

  // Don't show the component if there's no LinkedIn data
  if (!linkedinData) {
    return null;
  }

  // Safely parse the scraped_data JSON
  const scrapedData = linkedinData.scraped_data;
  let content = 'No content available';
  
  if (scrapedData) {
    try {
      // Handle different data types safely
      if (typeof scrapedData === 'string') {
        content = scrapedData;
      } else if (typeof scrapedData === 'object' && scrapedData !== null) {
        // Check if it has a content property
        if ('content' in scrapedData && typeof scrapedData.content === 'string') {
          content = scrapedData.content;
        } else {
          // Format the company data for display
          content = JSON.stringify(scrapedData, null, 2);
        }
      } else {
        content = String(scrapedData);
      }
    } catch (parseError) {
      console.error('Error parsing scraped data:', parseError);
      content = 'Error parsing LinkedIn data';
    }
  }

  return (
    <Card className="mb-6 animate-in fade-in-50 duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Company LinkedIn Information</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(linkedinData.linkedin_url, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  More Information
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>LinkedIn profile data available for {companyName}</span>
            <span>Last updated: {new Date(linkedinData.created_at).toLocaleDateString()}</span>
          </div>
          
          {showDetails && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg animate-in slide-in-from-top-2 duration-200">
              <h4 className="font-semibold mb-3">LinkedIn Company Profile:</h4>
              <div className="max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {content}
                </pre>
              </div>
            </div>
          )}
          
          {linkedinData.status === 'error' && (
            <div className="text-sm text-destructive">
              Error occurred while scraping: {linkedinData.error_message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
