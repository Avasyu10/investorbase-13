
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

    // BARC form submissions channel - FIXED subscription
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

    // Eureka form submissions channel - FIXED to match working BARC pattern
    const eurekaChannel = supabase
      .channel('eureka_form_submissions_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eureka_form_submissions'
        },
        async (payload) => {
          console.log('🎓 Eureka Update received:', payload);
          
          const newStatus = payload.new.analysis_status;
          const oldStatus = payload.old?.analysis_status;
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const companyId = payload.new.company_id;
          
          console.log(`📊 Eureka Status change: ${submissionId} from ${oldStatus} to ${newStatus}`);
          console.log(`📊 Company ID: ${companyId}`);
          
          // Immediately invalidate queries
          console.log('🔄 Invalidating queries...');
          await queryClient.invalidateQueries({ 
            queryKey: ['eureka-submissions'],
            refetchType: 'all'
          });
          
          await queryClient.invalidateQueries({ 
            queryKey: ['public-submissions'],
            refetchType: 'all'
          });
          console.log('✅ Queries invalidated');
          
          // Dispatch custom event for immediate UI updates
          const customEvent = new CustomEvent('eurekaStatusChange', {
            detail: {
              submissionId,
              status: newStatus,
              companyId,
              companyName
            }
          });
          
          console.log('📡 Dispatching eurekaStatusChange event:', customEvent.detail);
          window.dispatchEvent(customEvent);
          
          // Show notifications and handle navigation
          if (newStatus === 'completed' && oldStatus !== 'completed') {
            console.log('🎉 Eureka Analysis completed - showing notification');
            
            toast({
              title: "✅ Eureka Analysis completed!",
              description: `Analysis successfully completed for ${companyName}.`,
            });
            
            // Navigate to company page if available
            if (companyId) {
              setTimeout(() => {
                console.log(`🚀 Navigating to company: ${companyId}`);
                navigate(`/company/${companyId}`);
              }, 2000);
            }
          } else if (newStatus === 'failed' || newStatus === 'error') {
            console.log('❌ Eureka Analysis failed');
            toast({
              title: "❌ Eureka Analysis failed",
              description: `Analysis failed for ${companyName}. Please try again.`,
              variant: "destructive",
            });
          } else if (newStatus === 'processing' && oldStatus !== 'processing') {
            console.log('🔄 Eureka Analysis started - calling edge function');
            
            // Call the auto-analyze function when status changes to processing
            try {
              console.log('🚀 Calling auto-analyze-eureka-submission function for:', submissionId);
              
              const response = await supabase.functions.invoke('auto-analyze-eureka-submission', {
                body: { 
                  submissionId,
                  companyName,
                  submitterEmail: payload.new.submitter_email,
                  createdAt: payload.new.created_at
                }
              });
              
              if (response.error) {
                console.error('❌ Error from auto-analyze-eureka-submission:', response.error);
                toast({
                  title: 'Error processing Eureka submission',
                  description: `Failed to analyze submission: ${response.error.message}`,
                  variant: "destructive"
                });
              } else {
                console.log('✅ Auto-analyze-eureka-submission triggered successfully:', response.data);
                toast({
                  title: "🎓 Eureka Analysis Started",
                  description: `Analysis has begun for ${companyName || 'the submission'}. You'll be notified when complete.`,
                });
              }
            } catch (error: any) {
              console.error('❌ Error calling auto-analyze-eureka-submission:', error);
              toast({
                title: 'Error processing Eureka submission',
                description: `Failed to start analysis: ${error.message}`,
                variant: "destructive"
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eureka_form_submissions'
        },
        async (payload) => {
          console.log('🆕 New Eureka submission detected:', payload);
          
          // Broadcast new submission event
          window.dispatchEvent(new CustomEvent('eurekaNewSubmission', {
            detail: payload.new
          }));
          
          // Invalidate cache immediately
          await queryClient.invalidateQueries({ 
            queryKey: ['eureka-submissions'],
            refetchType: 'all'
          });
          await queryClient.invalidateQueries({ 
            queryKey: ['public-submissions'],
            refetchType: 'all'
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Eureka realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Eureka realtime subscription active');
        }
      });

    // Companies channel - trigger scraping when company is created with LinkedIn URL
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
          
          // Check if this company has a BARC submission with LinkedIn URL
          try {
            const { data: barcSubmission } = await supabase
              .from('barc_form_submissions')
              .select('company_linkedin_url')
              .eq('company_id', companyId)
              .single();
            
            if (barcSubmission?.company_linkedin_url) {
              console.log('🔗 Company has LinkedIn URL, triggering scraping:', barcSubmission.company_linkedin_url);
              
              // Trigger the scraping edge function
              const { error } = await supabase.functions.invoke('scraped_company_details', {
                body: { 
                  linkedInUrl: barcSubmission.company_linkedin_url,
                  companyId: companyId
                }
              });
              
              if (error) {
                console.error('❌ Failed to trigger company scraping:', error);
              } else {
                console.log('✅ Company scraping triggered successfully');
              }
            }
            
            // Also check Eureka submissions
            const { data: eurekaSubmission } = await supabase
              .from('eureka_form_submissions')
              .select('company_linkedin_url')
              .eq('company_id', companyId)
              .single();
            
            if (eurekaSubmission?.company_linkedin_url) {
              console.log('🔗 Eureka company has LinkedIn URL, triggering scraping:', eurekaSubmission.company_linkedin_url);
              
              // Trigger the scraping edge function
              const { error } = await supabase.functions.invoke('scraped_company_details', {
                body: { 
                  linkedInUrl: eurekaSubmission.company_linkedin_url,
                  companyId: companyId
                }
              });
              
              if (error) {
                console.error('❌ Failed to trigger Eureka company scraping:', error);
              } else {
                console.log('✅ Eureka company scraping triggered successfully');
              }
            }
          } catch (error) {
            console.error('❌ Error checking for LinkedIn URL:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('🏢 Companies realtime subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(barcChannel);
      supabase.removeChannel(eurekaChannel);
      supabase.removeChannel(companiesChannel);
    };
  }, [navigate, queryClient]);

  return null;
}
