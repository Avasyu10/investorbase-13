
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function useIITBombayUser() {
  const { user } = useAuth();
  const [isIITBombayUser, setIsIITBombayUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIITBombayStatus = async () => {
      if (!user) {
        setIsIITBombayUser(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Checking IIT Bombay status for user:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('is_iitbombay')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking IIT Bombay status:', error);
          setIsIITBombayUser(false);
        } else {
          console.log('IIT Bombay status check result:', data);
          setIsIITBombayUser(data?.is_iitbombay === true);
        }
      } catch (err) {
        console.error('Error in IIT Bombay check:', err);
        setIsIITBombayUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkIITBombayStatus();
  }, [user]);

  return { isIITBombayUser, isLoading };
}
