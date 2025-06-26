import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CompanyDetailsRecord {
  company_id: string;
  teammember_name: string | null;
}

interface UseCompanyDetailsRealtimeProps {
  onPocChanged: (companyId: string, oldPoc: string | null, newPoc: string | null) => void;
}

export const useCompanyDetailsRealtime = ({ onPocChanged }: UseCompanyDetailsRealtimeProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  const setupChannel = () => {
    if (!user) {
      console.log('❌ No user found, cannot setup realtime subscription');
      return;
    }

    console.log('🔄 Setting up company details realtime subscription for user:', user.id);

    // Clean up existing channel
    if (channelRef.current) {
      console.log('🧹 Cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel name with user ID to avoid conflicts
    const channelName = `company_details_changes_${user.id}_${Date.now()}`;
    
    // Subscribe to company_details table changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_details',
        },
        (payload) => {
          console.log('🔥 Company details updated - Raw payload:', payload);
          
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
            
            // Show toast notification immediately
            toast({
              title: "Team POC Updated",
              description: `Company ${newRecord.company_id.substring(0, 8)}... POC changed from "${oldPoc || 'None'}" to "${newPoc || 'None'}"`,
              duration: 5000,
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
          setIsConnected(true);
          setRetryCount(0);
          
          toast({
            title: "Real-time Connection Established",
            description: "You'll now receive notifications for team POC changes",
            duration: 3000,
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to company_details channel');
          setIsConnected(false);
          
          // Retry logic with exponential backoff
          if (retryCount < maxRetries) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
            console.log(`🔄 Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
            
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              setupChannel();
            }, retryDelay);
          } else {
            console.error('❌ Max retries reached, giving up');
            toast({
              title: "Connection Failed",
              description: "Unable to establish real-time connection. Notifications may not work.",
              variant: "destructive",
              duration: 5000,
            });
          }
        } else if (status === 'CLOSED') {
          console.log('📪 Channel closed');
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Test the subscription setup
    console.log('🧪 Testing realtime subscription setup...');
  };

  useEffect(() => {
    if (!user) {
      console.log('No user found, skipping realtime setup');
      return;
    }

    // Initial setup
    setupChannel();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up company details realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  // Re-setup channel when onPocChanged changes but keep the same connection
  useEffect(() => {
    // Don't re-setup if we don't have a user or connection
    if (!user || !isConnected) return;
    
    console.log('🔄 POC change handler updated, maintaining existing connection');
  }, [onPocChanged]);

  return { isConnected, retryCount };
};
