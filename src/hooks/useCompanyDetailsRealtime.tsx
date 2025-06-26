
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanyDetailsRecord {
  company_id: string;
  teammember_name: string | null;
}

interface UseCompanyDetailsRealtimeProps {
  onPocChanged: (companyId: string, oldPoc: string | null, newPoc: string | null) => void;
}

export const useCompanyDetailsRealtime = ({ onPocChanged }: UseCompanyDetailsRealtimeProps) => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      console.log('No user found, skipping realtime setup');
      return;
    }

    console.log('Setting up company details realtime subscription for user:', user.id);

    // Clean up existing channel
    if (channelRef.current) {
      console.log('Cleaning up existing channel');
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
          console.log('🔥 Company details updated - Raw payload:', payload);
          
          // Use Supabase's actual payload structure (old/new instead of old_record/new_record)
          const oldRecord = payload.old as CompanyDetailsRecord;
          const newRecord = payload.new as CompanyDetailsRecord;
          
          console.log('🔍 Parsed records:', { oldRecord, newRecord });
          
          // Check if teammember_name (POC) has changed
          const oldPoc = oldRecord?.teammember_name;
          const newPoc = newRecord?.teammember_name;
          
          console.log('🔍 POC comparison:', { oldPoc, newPoc });
          
          if (oldPoc !== newPoc) {
            console.log('🚨 POC changed detected!', { 
              oldPoc, 
              newPoc, 
              companyId: newRecord.company_id 
            });
            onPocChanged(newRecord.company_id, oldPoc || null, newPoc || null);
          } else {
            console.log('ℹ️ POC not changed, skipping notification');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Company details channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to company_details changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to company_details channel');
        }
      });

    channelRef.current = channel;

    // Test the subscription immediately
    console.log('🧪 Testing realtime subscription setup...');

    return () => {
      console.log('🧹 Cleaning up company details realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, onPocChanged]);

  return null;
};
