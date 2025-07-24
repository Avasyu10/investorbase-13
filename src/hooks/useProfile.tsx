
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_iitbombay: boolean;
  is_vc: boolean;
  is_manager: boolean;
  is_bits: boolean;
  is_view: boolean;
  is_bits_question: boolean;
  is_eximius?: boolean;
  signup_source: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return {
    profile,
    isLoading,
    error,
    isIITBombay: profile?.is_iitbombay || false,
    isIITBombayUser: profile?.is_iitbombay || false,
    isAdmin: profile?.is_admin || false,
    isVC: profile?.is_vc || false,
    isManager: profile?.is_manager || false,
    isBits: profile?.is_bits || false,
    isViewOnly: profile?.is_view || false,
    isVCAndBits: (profile?.is_vc && profile?.is_bits) || false,
    isBitsQuestion: profile?.is_bits_question || false,
    isEximius: profile?.is_eximius || false
  };
}
