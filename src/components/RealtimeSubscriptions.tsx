
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export function RealtimeSubscriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔥 Setting up streamlined realtime subscriptions');
    
    // Email pitch submissions channel
    const emailChannel = supabase
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

    // BARC form submissions channel - simplified and focused
    const barcChannel = supabase
      .channel('barc_submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🚀 BARC Update received:', payload);
          
          const newStatus = payload.new.analysis_status;
          const oldStatus = payload.old?.analysis_status;
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const companyId = payload.new.company_id;
          
          console.log(`📊 Status change: ${submissionId} from ${oldStatus} to ${newStatus}`);
          
          // Broadcast focused custom event for immediate UI updates
          window.dispatchEvent(new CustomEvent('barcStatusChange', {
            detail: {
              submissionId,
              status: newStatus,
              companyId,
              companyName
            }
          }));
          
          // Invalidate cache after a small delay to let UI update first
          setTimeout(async () => {
            await queryClient.invalidateQueries({ 
              queryKey: ['barc-submissions'],
              refetchType: 'all'
            });
            
            await queryClient.invalidateQueries({ 
              queryKey: ['public-submissions'],
              refetchType: 'all'
            });
          }, 100);
          
          // Show notifications for status changes
          if (newStatus === 'completed' && oldStatus !== 'completed') {
            toast({
              title: "✅ Analysis completed!",
              description: `Analysis successfully completed for ${companyName}`,
            });
            
            if (companyId) {
              setTimeout(() => {
                toast({
                  title: "Redirecting to Company Page",
                  description: `Taking you to ${companyName}'s detailed analysis...`,
                });
                navigate(`/company/${companyId}`);
              }, 2000);
            }
          } else if (newStatus === 'failed' || newStatus === 'error') {
            toast({
              title: "❌ Analysis failed",
              description: `Analysis failed for ${companyName}. Please try again.`,
              variant: "destructive",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🆕 New BARC submission detected:', payload);
          
          // Broadcast new submission event
          window.dispatchEvent(new CustomEvent('barcNewSubmission', {
            detail: payload.new
          }));
          
          // Invalidate cache
          setTimeout(async () => {
            await queryClient.invalidateQueries({ 
              queryKey: ['barc-submissions'],
              refetchType: 'all'
            });
            await queryClient.invalidateQueries({ 
              queryKey: ['public-submissions'],
              refetchType: 'all'
            });
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 BARC realtime status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(barcChannel);
    };
  }, [navigate, queryClient]);

  return null;
}
