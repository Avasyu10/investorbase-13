
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

    // BARC form submissions channel - Listen for analysis completion
    const barcChannel = supabase
      .channel('barc_form_submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        async (payload) => {
          console.log('🚀 BARC Update received:', payload);
          
          const newStatus = payload.new.analysis_status;
          const oldStatus = payload.old?.analysis_status;
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const companyId = payload.new.company_id;
          
          console.log(`📊 Status change: ${submissionId} from ${oldStatus} to ${newStatus}`);
          console.log(`📊 Company ID: ${companyId}`);
          
          // Immediately invalidate queries FIRST
          console.log('🔄 Invalidating queries...');
          await queryClient.invalidateQueries({ 
            queryKey: ['barc-submissions'],
            refetchType: 'all'
          });
          
          await queryClient.invalidateQueries({ 
            queryKey: ['public-submissions'],
            refetchType: 'all'
          });
          console.log('✅ Queries invalidated');
          
          // Dispatch custom event for immediate UI updates
          const customEvent = new CustomEvent('barcStatusChange', {
            detail: {
              submissionId,
              status: newStatus,
              companyId,
              companyName
            }
          });
          
          console.log('📡 Dispatching barcStatusChange event:', customEvent.detail);
          window.dispatchEvent(customEvent);
          
          // Show notifications and handle navigation
          if (newStatus === 'completed' && oldStatus !== 'completed') {
            console.log('🎉 Analysis completed - showing notification and navigating');
            
            toast({
              title: "✅ Analysis completed!",
              description: `Analysis successfully completed for ${companyName}. Redirecting to company page...`,
            });
            
            // Navigate to company page after a short delay
            if (companyId) {
              setTimeout(() => {
                console.log(`🚀 Navigating to company: ${companyId}`);
                navigate(`/company/${companyId}`);
              }, 2000);
            }
          } else if (newStatus === 'failed' || newStatus === 'error') {
            console.log('❌ Analysis failed');
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
        async (payload) => {
          console.log('🆕 New BARC submission detected:', payload);
          
          // Broadcast new submission event
          window.dispatchEvent(new CustomEvent('barcNewSubmission', {
            detail: payload.new
          }));
          
          // Invalidate cache immediately
          await queryClient.invalidateQueries({ 
            queryKey: ['barc-submissions'],
            refetchType: 'all'
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['public-submissions'],
            refetchType: 'all'
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 BARC realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ BARC realtime subscription active');
        }
      });

    // Listen for new companies being created (after analysis completion)
    const companiesChannel = supabase
      .channel('companies_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'companies'
        },
        async (payload) => {
          console.log('🏢 New company created:', payload);
          
          const companyId = payload.new.id;
          const companyName = payload.new.name;
          
          console.log(`🎯 Company created with ID: ${companyId}, triggering scraping if LinkedIn URL available`);
          
          // Invalidate company-related queries
          await queryClient.invalidateQueries({ 
            queryKey: ['companies'],
            refetchType: 'all'
          });
          
          // Trigger scraping hook refresh for this company
          await queryClient.invalidateQueries({ 
            queryKey: ['barc-submission', companyId],
            refetchType: 'all'
          });
          
          toast({
            title: "✅ Company created!",
            description: `Company "${companyName}" has been created and additional data scraping is starting...`,
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Companies realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Companies realtime subscription active');
        }
      });

    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(barcChannel);
      supabase.removeChannel(companiesChannel);
    };
  }, [navigate, queryClient]);

  return null;
}
