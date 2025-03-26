
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeSubscriptions() {
  useEffect(() => {
    console.log('Setting up realtime subscription for email_pitch_submissions');
    
    // Subscribe to email pitch submissions with detailed logging
    const channel = supabase
      .channel('email_pitch_submissions_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_pitch_submissions'
        },
        (payload) => {
          console.log('New email pitch submission detected:', payload);
          
          // Get the submission ID
          const submissionId = payload.new.id;
          console.log(`Triggering auto-analyze for submission ID: ${submissionId}`);
          
          // Call the auto-analyze edge function
          supabase.functions.invoke('auto-analyze-email-pitch-pdf', {
            body: { id: submissionId }
          })
          .then(response => {
            console.log('Auto-analyze function response:', response);
            
            if (response.error) {
              console.error('Error from auto-analyze function:', response.error);
              toast({
                title: 'Error processing submission',
                description: `Failed to analyze submission: ${response.error.message || 'Unknown error'}`,
                variant: "destructive"
              });
              return;
            }
            
            toast({
              title: 'New pitch submission',
              description: `Processing submission from ${payload.new.sender_email || 'unknown'}`,
            });
          })
          .catch(error => {
            console.error('Error calling auto-analyze function:', error);
            
            toast({
              title: 'Error processing submission',
              description: `Failed to analyze submission: ${error.message}`,
              variant: "destructive"
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
