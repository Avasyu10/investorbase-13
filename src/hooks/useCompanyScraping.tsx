
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scrapeCompanyLinkedIn } from '@/lib/api/barc';
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

  // Fetch BARC submission to get the LinkedIn URL
  const { data: barcSubmission } = useQuery({
    queryKey: ['barc-submission', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('id, company_linkedin_url')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching BARC submission:', error);
        return null;
      }

      return data as BarcSubmission | null;
    },
    enabled: !!companyId,
  });

  // Fetch existing scrape data for the company
  const { data: scrapeData, isLoading } = useQuery({
    queryKey: ['company-scrape', companyId],
    queryFn: async () => {
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

      return data as CompanyScrapeData | null;
    },
    enabled: !!companyId,
  });

  // Mutation to trigger scraping
  const scrapeMutation = useMutation({
    mutationFn: async () => {
      if (!barcSubmission?.company_linkedin_url) {
        throw new Error('No LinkedIn URL found in BARC submission');
      }
      return scrapeCompanyLinkedIn(barcSubmission.company_linkedin_url, companyId);
    },
    onSuccess: () => {
      toast({
        title: "Scraping initiated",
        description: "Company LinkedIn scraping has been started successfully.",
      });
      
      // Invalidate and refetch the scrape data
      queryClient.invalidateQueries({ queryKey: ['company-scrape', companyId] });
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

  return {
    scrapeData,
    isLoading,
    scrapeMutation,
    linkedInUrl: barcSubmission?.company_linkedin_url || null,
    hasLinkedInUrl: !!barcSubmission?.company_linkedin_url,
    isScrapingInProgress: scrapeMutation.isPending || (scrapeData?.status === 'processing'),
  };
};
