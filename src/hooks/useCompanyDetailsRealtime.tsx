
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanyDetailsChange {
  old_record?: {
    company_id: string;
    teammember_name: string | null;
  };
  new_record: {
    company_id: string;
    teammember_name: string | null;
  };
}

interface UseCompanyDetailsRealtimeProps {
  onPocChanged: (companyId: string, oldPoc: string | null, newPoc: string | null) => void;
}

export const useCompanyDetailsRealtime = ({ onPocChanged }: UseCompanyDetailsRealtimeProps) => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up company details realtime subscription');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to company_details table changes
    const channel = supabase
      .channel('company_details_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_details',
        },
        (payload) => {
          console.log('Company details updated:', payload);
          const change = payload as CompanyDetailsChange;
          
          // Check if teammember_name (POC) has changed
          const oldPoc = change.old_record?.teammember_name;
          const newPoc = change.new_record?.teammember_name;
          
          if (oldPoc !== newPoc) {
            console.log('POC changed:', { oldPoc, newPoc, companyId: change.new_record.company_id });
            onPocChanged(change.new_record.company_id, oldPoc || null, newPoc || null);
          }
        }
      )
      .subscribe((status) => {
        console.log('Company details channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up company details realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, onPocChanged]);

  return null;
};
