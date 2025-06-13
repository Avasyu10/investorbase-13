
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
}

export const CompanyLinkedInInfo = ({ companyId, companyName }: CompanyLinkedInInfoProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Fetch company LinkedIn scrape data from company_scrapes table
  const { data: linkedinData, isLoading } = useQuery({
    queryKey: ['company-scrapes', companyId],
    queryFn: async () => {
      // First, get the BARC submission to find the company LinkedIn URL
      const { data: submission, error: submissionError } = await supabase
        .from('barc_form_submissions')
        .select('company_linkedin_url')
        .eq('company_id', companyId)
        .maybeSingle();

      if (submissionError || !submission?.company_linkedin_url) {
        return null;
      }

      // Then fetch the LinkedIn scrape data from company_scrapes table
      const { data: scrapeData, error: scrapeError } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('company_id', companyId)
        .eq('linkedin_url', submission.company_linkedin_url)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (scrapeError) {
        console.error('Error fetching company scrape data:', scrapeError);
        return null;
      }

      return scrapeData;
    },
    enabled: !!companyId,
  });

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

  if (!linkedinData) {
    return null; // Don't show the component if there's no LinkedIn data
  }

  // Safely parse the scraped_data JSON
  const scrapedData = linkedinData.scraped_data as ScrapedData | null;
  const content = scrapedData?.content || 'No content available';

  return (
    <Card className="mb-6">
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
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
              <h4 className="font-semibold mb-3">LinkedIn Profile Content:</h4>
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
