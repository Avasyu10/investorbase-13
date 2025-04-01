
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function BarcConfirmationEmail() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    console.log('[BarcConfirmationEmail] Component mounted, setting up subscription');
    
    // Subscribe to email pitch submissions with detailed logging
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
          console.log('[BarcConfirmationEmail] New public form submission detected:', payload);
          
          // Get the submission ID and email
          const submissionId = payload.new.id;
          const email = payload.new.email;
          const companyName = payload.new.company_name || '';
          
          console.log(`[BarcConfirmationEmail] Processing submission ID: ${submissionId}, Email: ${email}, Company: ${companyName}`);
          
          // Call the confirmation email edge function
          console.log('[BarcConfirmationEmail] Invoking barc_confirmation_email function');
          
          // Use supabase.functions.invoke with debug mode enabled
          supabase.functions.invoke('barc_confirmation_email', {
            body: { 
              id: submissionId,
              email: email,
              companyName: companyName,
              debug: true // Enable verbose logging
            }
          })
          .then(response => {
            console.log('[BarcConfirmationEmail] Function response received:', response);
            
            if (response.error) {
              console.error('[BarcConfirmationEmail] Error from function:', response.error);
              
              toast.error('Failed to send confirmation email', {
                description: `Error: ${response.error.message || 'Unknown error'}`,
              });
              return;
            }
            
            if (response.data?.success) {
              console.log('[BarcConfirmationEmail] Email sent successfully:', response.data);
              
              toast.success('Confirmation email sent', {
                description: `Email sent to ${email}`,
              });
            } else {
              console.warn('[BarcConfirmationEmail] Unexpected response format:', response.data);
              
              toast.error('Unexpected response from email service', {
                description: 'Please check the logs for details',
              });
            }
          })
          .catch(error => {
            console.error('[BarcConfirmationEmail] Error calling function:', error);
            
            toast.error('Error sending confirmation email', {
              description: error.message || 'Failed to connect to email service',
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('[BarcConfirmationEmail] Subscription status:', status);
        setIsInitialized(true);
      });
    
    // Test the function directly to verify it works
    console.log('[BarcConfirmationEmail] Sending test call to function');
    supabase.functions.invoke('barc_confirmation_email', {
      body: { 
        id: 'test-id',
        email: 'test@example.com',
        companyName: 'Test Company',
        debug: true
      }
    })
    .then(response => {
      console.log('[BarcConfirmationEmail] Test function response:', response);
    })
    .catch(error => {
      console.error('[BarcConfirmationEmail] Test function error:', error);
    });
    
    // Return cleanup function
    return () => {
      console.log('[BarcConfirmationEmail] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Log when component initializes successfully
  useEffect(() => {
    if (isInitialized) {
      console.log('[BarcConfirmationEmail] Subscription initialized successfully');
    }
  }, [isInitialized]);

  // This component doesn't render anything visible
  return null;
}
