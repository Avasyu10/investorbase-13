import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useEurekaStats() {
  const { user } = useAuth();

  const {
    data: statsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['eureka-stats', user?.id],
    queryFn: async () => {
      try {
        if (!user) {
          console.log('No user found, returning empty results');
          return { 
            totalProspects: 0, 
            highPotential: 0, 
            mediumPotential: 0, 
            badPotential: 0 
          };
        }

        console.log('Fetching Eureka stats for user:', user.id);
        
        // First, get the total count of all Eureka submissions
        const { count: totalCount, error: countError } = await supabase
          .from('eureka_form_submissions')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('Error getting total Eureka count:', countError);
          throw countError;
        }

        console.log(`Total Eureka registrations: ${totalCount}`);

        // Now get analyzed submissions with scores
        let allAnalyzedSubmissions: any[] = [];
        let start = 0;
        const batchSize = 1000;
        let fetchMore = true;

        while (fetchMore) {
          const { data: batchData, error: batchError } = await supabase
            .from('eureka_form_submissions')
            .select(`
              id,
              company_id,
              companies!inner(overall_score)
            `)
            .not('companies.overall_score', 'is', null)
            .range(start, start + batchSize - 1);

          if (batchError) {
            console.error('Error fetching analyzed submissions batch:', batchError);
            break;
          }

          if (batchData && batchData.length > 0) {
            allAnalyzedSubmissions = [...allAnalyzedSubmissions, ...batchData];
            start += batchSize;
            fetchMore = batchData.length === batchSize;
          } else {
            fetchMore = false;
          }
        }

        console.log(`Found ${allAnalyzedSubmissions.length} analyzed submissions`);

        // Calculate potential stats based on scores
        const highPotential = allAnalyzedSubmissions.filter(s => 
          s.companies && s.companies.overall_score > 70
        ).length;
        
        const badPotential = allAnalyzedSubmissions.filter(s => 
          s.companies && s.companies.overall_score < 50
        ).length;

        // Medium potential = all remaining submissions (analyzed medium + unanalyzed)
        const analyzedMediumPotential = allAnalyzedSubmissions.filter(s => 
          s.companies && s.companies.overall_score >= 50 && s.companies.overall_score <= 70
        ).length;
        
        const unanalyzedCount = (totalCount || 0) - allAnalyzedSubmissions.length;
        const mediumPotential = analyzedMediumPotential + unanalyzedCount;

        console.log(`Eureka potential stats: High: ${highPotential}, Medium: ${mediumPotential}, Bad: ${badPotential}, Total: ${totalCount}`);

        return {
          totalProspects: totalCount || 0,
          highPotential,
          mediumPotential,
          badPotential,
        };
      } catch (err) {
        console.error("Error in useEurekaStats:", err);
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      onError: (err: any) => {
        console.error("useEurekaStats query error:", err);
        toast({
          title: 'Error loading Eureka stats',
          description: err.message || 'Failed to load Eureka statistics. Please try refreshing the page.',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    totalProspects: statsData?.totalProspects || 0,
    highPotential: statsData?.highPotential || 0,
    mediumPotential: statsData?.mediumPotential || 0,
    badPotential: statsData?.badPotential || 0,
    isLoading,
    error,
    refetch,
  };
}