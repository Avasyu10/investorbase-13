
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeSubscriptions() {
  useEffect(() => {
    console.log('Setting up realtime subscription for email_pitch_submissions');
    
    // Subscribe to email pitch submissions
    const emailPitchChannel = supabase
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
          console.log(`Submission ID: ${submissionId}`);
          
          // Call the auto-analyze edge function
          console.log(`About to invoke auto-analyze-email-pitch-pdf for submission ID: ${submissionId}`);
          
          supabase.functions.invoke('auto-analyze-email-pitch-pdf', {
            body: { 
              id: submissionId,
              debug: true
            }
          })
          .then(response => {
            console.log('Auto-analyze function response received');
            
            if (response.error) {
              console.error('Error from auto-analyze function:', response.error);
              
              toast({
                title: 'Error processing submission',
                description: `Failed to analyze submission: ${response.error.message || 'Unknown error'}`,
                variant: "destructive"
              });
              return;
            }
            
            if (response.data) {
              console.log('Response data:', response.data);
              
              toast({
                title: 'New pitch submission',
                description: `Processing submission from ${payload.new.sender_email || 'unknown'}`,
              });
            }
          })
          .catch(error => {
            console.error('Error calling auto-analyze function:', error);
            
            toast({
              title: 'Error processing submission',
              description: `Failed to analyze submission: ${error.message || 'Unknown error'}`,
              variant: "destructive"
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('Email pitch submissions subscription status:', status);
      });
    
    // Subscribe to public form submissions
    const publicFormChannel = supabase
      .channel('public_form_submissions_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'public_form_submissions'
        },
        (payload) => {
          console.log('New public form submission detected:', payload);
          
          const submissionId = payload.new.id;
          const submitterEmail = payload.new.submitter_email;
          
          toast({
            title: 'New form submission',
            description: `Received submission from ${submitterEmail || 'unknown'}`,
          });
        }
      )
      .subscribe((status) => {
        console.log('Public form submissions subscription status:', status);
      });
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(emailPitchChannel);
      supabase.removeChannel(publicFormChannel);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
