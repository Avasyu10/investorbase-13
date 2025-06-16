import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export function RealtimeSubscriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔥 Setting up realtime subscriptions');
    
    // Email pitch submissions channel
    const emailChannel = supabase
      .channel('email_pitch_submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_pitch_submissions'
        },
        (payload) => {
          console.log('New email pitch submission detected:', payload);
          
          const submissionId = payload.new.id;
          
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
              
              let errorMsg = response.error.message || 'Unknown error';
              
              try {
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
                description: `Failed to analyze submission: ${errorMsg}`,
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
            
            let errorMessage = error.message || 'Unknown error';
            
            if (errorMessage.includes('blocked by CORS policy')) {
              errorMessage = 'Access blocked by CORS policy. Please check your server configuration.';
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
        console.log('Email pitch realtime subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up email realtime subscriptions');
      supabase.removeChannel(emailChannel);
    };
  }, [navigate, queryClient]);

  return null;
}
