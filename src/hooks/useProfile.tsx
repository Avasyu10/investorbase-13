
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });
};

export const useVCProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vc-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      const { data, error } = await supabase
        .from('vc_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching VC profile:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });
};
