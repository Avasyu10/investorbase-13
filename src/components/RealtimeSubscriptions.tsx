import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export function RealtimeSubscriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔥 Setting up CENTRALIZED realtime subscriptions with IMMEDIATE updates');
    
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
          console.log(`Submission ID: ${submissionId}`);
          
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
              let errorDetails = '';
              
              try {
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
            
            if (typeof error === 'object' && error.context) {
              console.error('Error context:', error.context);
            }
            
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

    // BARC form submissions channel - ENHANCED for immediate updates
    const barcChannel = supabase
      .channel('barc_submissions_central_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🚀 CENTRAL BARC Update received:', payload);
          
          const newStatus = payload.new.analysis_status;
          const oldStatus = payload.old?.analysis_status;
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const companyId = payload.new.company_id;
          
          console.log(`📊 Status change detected: ${submissionId} from ${oldStatus} to ${newStatus}`);
          
          // IMMEDIATE broadcast custom event FIRST - this is critical for UI updates
          console.log('📢 Broadcasting IMMEDIATE custom event');
          window.dispatchEvent(new CustomEvent('barcStatusUpdate', {
            detail: {
              submissionId,
              oldStatus,
              newStatus,
              companyName,
              companyId
            }
          }));
          
          // THEN handle cache invalidation (don't wait for it)
          console.log('💥 Scheduling cache invalidation...');
          
          // Use a small timeout to let UI update first, then invalidate cache
          setTimeout(async () => {
            try {
              // Invalidate all related queries
              await Promise.all([
                queryClient.invalidateQueries({ 
                  queryKey: ['barc-submissions'],
                  refetchType: 'all'
                }),
                queryClient.invalidateQueries({ 
                  queryKey: ['public-submissions'],
                  refetchType: 'all'
                })
              ]);
              
              // Force refetch for active queries
              await Promise.all([
                queryClient.refetchQueries({ 
                  queryKey: ['barc-submissions'],
                  type: 'active'
                }),
                queryClient.refetchQueries({ 
                  queryKey: ['public-submissions'],
                  type: 'active'
                })
              ]);
              
              console.log('✅ Cache invalidation completed');
            } catch (error) {
              console.error('❌ Cache invalidation error:', error);
            }
          }, 100); // Small delay to prioritize UI update
          
          // Show status notifications
          if (newStatus === 'processing' && oldStatus !== 'processing') {
            toast({
              title: "Analysis started",
              description: `Analysis is now running for ${companyName}`,
            });
          } else if (newStatus === 'completed' && oldStatus !== 'completed') {
            toast({
              title: "✅ Analysis completed!",
              description: `Analysis successfully completed for ${companyName}`,
            });
            
            // Auto-navigation to company page
            if (companyId) {
              console.log(`🚀 AUTO-NAVIGATING to company page: ${companyId}`);
              
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
          
          // Immediate custom event broadcast
          window.dispatchEvent(new CustomEvent('barcNewSubmission', {
            detail: payload.new
          }));
          
          // Then handle cache invalidation
          setTimeout(async () => {
            try {
              await Promise.all([
                queryClient.invalidateQueries({ 
                  queryKey: ['barc-submissions'],
                  refetchType: 'all'
                }),
                queryClient.invalidateQueries({ 
                  queryKey: ['public-submissions'],
                  refetchType: 'all'
                })
              ]);
            } catch (error) {
              console.error('❌ New submission cache invalidation error:', error);
            }
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 Central BARC realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Central BARC realtime subscription is ACTIVE');
        } else if (status === 'CLOSED') {
          console.log('❌ Central BARC realtime subscription CLOSED');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('💥 Central BARC realtime subscription ERROR');
        }
      });

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up CENTRALIZED realtime subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(barcChannel);
    };
  }, [navigate, queryClient]);

  // This component doesn't render anything
  return null;
}
