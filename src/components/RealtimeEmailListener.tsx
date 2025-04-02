
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeEmailListener() {
  useEffect(() => {
    console.log('Setting up realtime subscription for public_form_submissions');
    
    // Subscribe to public form submissions
    const channel = supabase
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
          
          // Call the confirmation email edge function
          supabase.functions.invoke('barc_confirmation_email', {
            body: { record: payload.new }
          })
          .then(response => {
            console.log('Confirmation email function response:', response);
            
            if (response.error) {
              console.error('Error from confirmation email function:', response.error);
              toast({
                title: 'Error sending confirmation email',
                description: `Failed to send email: ${response.error.message || 'Unknown error'}`,
                variant: "destructive"
              });
              return;
            }
            
            toast({
              title: 'Confirmation email sent',
              description: `Email sent to ${payload.new.submitter_email || 'applicant'}`,
            });
          })
          .catch(error => {
            console.error('Error calling confirmation email function:', error);
            toast({
              title: 'Error sending confirmation email',
              description: `Failed to send email: ${error.message || 'Unknown error'}`,
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
