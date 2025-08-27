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
      if (!user) {
        console.log('No user found, returning empty results');
        return {
          totalProspects: 0,
          highPotential: 0,
          mediumPotential: 0,
          badPotential: 0,
        };
      }

      console.log('Invoking eureka-stats edge function for user:', user.id);
      const { data, error: fnError } = await supabase.functions.invoke('eureka-stats');

      if (fnError) {
        console.error('useEurekaStats: edge function error', fnError);
        throw fnError;
      }

      const stats = data as any || {};

      return {
        totalProspects: stats.totalProspects || 0,
        highPotential: stats.highPotential || 0,
        mediumPotential: stats.mediumPotential || 0,
        badPotential: stats.badPotential || 0,
      };
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh stats
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