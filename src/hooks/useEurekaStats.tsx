import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EurekaStats {
  totalRegistrations: number;
  analyzedRegistrations: number;
  highPotential: number;
  mediumPotential: number;
  badPotential: number;
}

export function useEurekaStats() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['eureka-stats'],
    queryFn: async (): Promise<EurekaStats> => {
      try {
        console.log('Fetching Eureka registration stats...');
        
        const { data, error } = await supabase.functions.invoke('get-eureka-stats');

        if (error) {
          console.error('Error calling get-eureka-stats function:', error);
          throw error;
        }

        return data;
      } catch (err) {
        console.error('Error in useEurekaStats:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      onError: (err: any) => {
        console.error("useEurekaStats query error:", err);
        toast({
          title: 'Error loading Eureka stats',
          description: err.message || 'Failed to load Eureka registration statistics.',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    stats: stats || {
      totalRegistrations: 0,
      analyzedRegistrations: 0,
      highPotential: 0,
      mediumPotential: 0,
      badPotential: 0
    },
    isLoading,
    error,
    refetch,
  };
}