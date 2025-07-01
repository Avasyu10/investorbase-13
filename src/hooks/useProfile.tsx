
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_bits: boolean | null;
  is_admin: boolean;
  is_iitbombay: boolean;
  is_manager: boolean;
  is_vc: boolean;
  created_at: string;
  updated_at: string;
  signup_source: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const isIITBombay = profile?.is_iitbombay || false;
  const isBits = profile?.is_bits || false;
  const isVC = profile?.is_vc || false;
  const isAdmin = profile?.is_admin || false;
  const isManager = profile?.is_manager || false;

  return {
    profile,
    isLoading,
    error,
    isIITBombay,
    isBits,
    isVC,
    isAdmin,
    isManager,
  };
};
