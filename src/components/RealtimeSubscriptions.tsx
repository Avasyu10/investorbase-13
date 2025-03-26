
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
          console.log(`Submission ID: ${submissionId}`);
          
          // Call the auto-analyze edge function - WITH FULL LOGGING OF EACH STEP
          console.log(`About to invoke auto-analyze-email-pitch-pdf for submission ID: ${submissionId}`);
          
          // Use supabase.functions.invoke instead of direct fetch to ensure proper URL construction
          supabase.functions.invoke('auto-analyze-email-pitch-pdf', {
            body: { 
              id: submissionId,
              debug: true // Add a debug flag to enable verbose logging
            }
          })
          .then(response => {
            console.log('Auto-analyze function response received');
            
            // Fix: Check response.error first since status may not exist on error responses
            if (response.error) {
              console.error('Error from auto-analyze function:', response.error);
              
              // Get more detailed error information
              let errorMsg = response.error.message || 'Unknown error';
              let errorDetails = '';
              
              try {
                // Check if the error might contain more detailed JSON info
                if (typeof response.error === 'object' && response.error.context) {
                  errorDetails = ` - ${JSON.stringify(response.error.context)}`;
                }
                if (typeof response.error.message === 'string' && response.error.message.includes('{')) {
                  const jsonPart = response.error.message.substring(response.error.message.indexOf('{'));
                  const parsedError = JSON.parse(jsonPart);
                  if (parsedError.error) {
                    errorMsg = parsedError.error;
                  }
                }
              } catch (e) {
                console.log('Could not parse additional error info:', e);
              }
              
              toast({
                title: 'Error processing submission',
                description: `Failed to analyze submission: ${errorMsg}${errorDetails}`,
                variant: "destructive"
              });
              return;
            }
            
            // Now it's safe to check status and data (on success response only)
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
            
            // Try to get more detailed error information
            let errorMessage = error.message || 'Unknown error';
            
            if (typeof error === 'object' && error.context) {
              console.error('Error context:', error.context);
            }
            
            toast({
              title: 'Error processing submission',
              description: `Failed to analyze submission: ${errorMessage}`,
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
