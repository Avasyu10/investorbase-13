
import { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeEmailListener() {
  // Use a ref to track if we've already subscribed
  const hasSubscribed = useRef(false);
  
  useEffect(() => {
    // Only set up subscription if we haven't already
    if (hasSubscribed.current) {
      console.log('Subscription already exists, skipping');
      return;
    }
    
    console.log('Setting up realtime subscription for public_form_submissions');
    hasSubscribed.current = true;
    
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
              return;
            }
            
            toast({
              title: 'Confirmation email sent',
              description: `Email sent to ${payload.new.submitter_email || 'applicant'}`,
            });
          })
          .catch(error => {
            console.error('Error calling confirmation email function:', error);
          });
        }
      )
      
      // Add listener for Eureka form submissions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eureka_form_submissions'
        },
        (payload) => {
          console.log('New Eureka form submission detected:', payload);
          
          // Call the confirmation email edge function for Eureka submissions too
          supabase.functions.invoke('barc_confirmation_email', {
            body: { record: payload.new }
          })
          .then(response => {
            console.log('Eureka confirmation email function response:', response);
            
            if (response.error) {
              console.error('Error from Eureka confirmation email function:', response.error);
              return;
            }
            
            toast({
              title: 'Confirmation email sent',
              description: `Email sent to ${payload.new.submitter_email || 'applicant'}`,
            });
          })
          .catch(error => {
            console.error('Error calling Eureka confirmation email function:', error);
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
      hasSubscribed.current = false;
    };
  }, []);

  // This component doesn't render anything
  return null;
}
