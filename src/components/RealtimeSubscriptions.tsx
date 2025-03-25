
import { useEffect } from 'react';
import { subscribeToEmailPitchSubmissions } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export function RealtimeSubscriptions() {
  useEffect(() => {
    // Subscribe to email pitch submissions
    const channel = subscribeToEmailPitchSubmissions((submission) => {
      toast({
        title: 'New email pitch submission',
        description: `Received from ${submission.sender_email}`,
      });
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
