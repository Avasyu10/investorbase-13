
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CompanyScrapeData {
  id: string;
  linkedin_url: string;
  company_id: string;
  status: string;
  scraped_data: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface BarcSubmission {
  id: string;
  company_linkedin_url: string | null;
}

export const useCompanyScraping = (companyId: string) => {
  const queryClient = useQueryClient();

  // Fetch BARC submission to get the LinkedIn URL using the companies table ID
  const { data: barcSubmission } = useQuery({
    queryKey: ['barc-submission', companyId],
    queryFn: async () => {
      console.log("Fetching BARC submission for company:", companyId);
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('id, company_linkedin_url')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BARC submission:', error);
        return null;
      }

      console.log("BARC submission data:", data);
      return data as BarcSubmission | null;
    },
    enabled: !!companyId,
  });

  // Fetch existing scrape data for the company with aggressive polling when scraping
  const { data: scrapeData, isLoading } = useQuery({
    queryKey: ['company-scrape', companyId],
    queryFn: async () => {
      console.log("Fetching scrape data for company:", companyId);
      const { data, error } = await supabase
        .from('company_scrapes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company scrape data:', error);
        throw error;
      }

      console.log("Scrape data fetched:", data);
      return data as CompanyScrapeData | null;
    },
    enabled: !!companyId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if scraping is in progress or pending
      const data = query.state.data as CompanyScrapeData | null;
      const isProcessing = data?.status === 'processing' || data?.status === 'pending';
      console.log("Refetch interval check:", { status: data?.status, isProcessing });
      return isProcessing ? 2000 : false;
    },
    refetchIntervalInBackground: true,
    staleTime: 0, // Always refetch to get the latest data
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Mutation to trigger scraping using scraped_company_details edge function
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      if (!barcSubmission?.company_linkedin_url) {
        throw new Error('No LinkedIn URL found in BARC submission');
      }

      console.log("Calling scraped_company_details function with URL:", barcSubmission.company_linkedin_url);
      
      const { data, error } = await supabase.functions.invoke('scraped_company_details', {
        body: { 
          linkedInUrl: barcSubmission.company_linkedin_url,
          companyId: companyId
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to scrape company data");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("Function response:", data);
      return data;
    },
    onSuccess: () => {
      console.log("Scraping initiated successfully, starting to poll for results");
      
      // Immediately start polling by invalidating queries
      queryClient.invalidateQueries({ queryKey: ['company-scrape', companyId] });
      
      // Also refetch to get immediate updates
      queryClient.refetchQueries({ queryKey: ['company-scrape', companyId] });
    },
    onError: (error: any) => {
      console.error('Company scraping error:', error);
      toast({
        title: "Scraping failed",
        description: `Failed to scrape company data: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Determine if scraping is in progress (either mutation pending or status is processing/pending)
  const isScrapingInProgress = scrapeMutation.isPending || 
    (scrapeData?.status === 'processing') || 
    (scrapeData?.status === 'pending');

  console.log("useCompanyScraping hook state:", {
    companyId,
    hasLinkedInUrl: !!barcSubmission?.company_linkedin_url,
    scrapeData,
    isScrapingInProgress,
    mutationPending: scrapeMutation.isPending,
    hasScrapedData: !!scrapeData?.scraped_data
  });

  return {
    scrapeData,
    isLoading,
    scrapeMutation,
    linkedInUrl: barcSubmission?.company_linkedin_url || null,
    hasLinkedInUrl: !!barcSubmission?.company_linkedin_url,
    isScrapingInProgress,
  };
};
