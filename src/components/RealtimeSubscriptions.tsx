
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function RealtimeSubscriptions() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Setting up realtime subscription for email_pitch_submissions');
    
    // Subscribe to email pitch submissions with detailed logging
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

    // SIMPLIFIED BARC form submissions realtime subscription - GLOBAL ONLY
    console.log('🎯 Setting up SIMPLIFIED GLOBAL BARC form submissions realtime subscription...');
    
    const barcChannel = supabase
      .channel('barc_form_submissions_global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🚀 NEW BARC FORM SUBMISSION DETECTED:', payload);
          
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const submitterEmail = payload.new.submitter_email;
          
          console.log(`📋 New submission:`, {
            id: submissionId,
            company: companyName,
            email: submitterEmail,
            timestamp: new Date().toISOString()
          });
          
          // Show notification for new submission
          toast({
            title: '🎯 New BARC Application Received',
            description: `Application from ${companyName || 'unknown company'} received successfully.`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('📊 BARC SUBMISSION STATUS UPDATE DETECTED:', payload);
          
          const oldStatus = payload.old.analysis_status;
          const newStatus = payload.new.analysis_status;
          const companyName = payload.new.company_name;
          const submissionId = payload.new.id;
          const companyId = payload.new.company_id;
          
          console.log(`🔄 Status transition: ${oldStatus} → ${newStatus} for ${companyName} (ID: ${submissionId})`);
          
          // Show toast notifications for status changes
          if (oldStatus !== newStatus) {
            if (newStatus === 'processing') {
              toast({
                title: '🔄 Analysis Started',
                description: `Analysis is now running for ${companyName}`,
              });
            } else if (newStatus === 'completed') {
              console.log(`✅ ANALYSIS COMPLETED for ${companyName}! Company ID: ${companyId}`);
              
              toast({
                title: '✅ Analysis Completed',
                description: `Analysis successfully completed for ${companyName}`,
              });
              
              // AUTO-NAVIGATION: Redirect to company page after a short delay
              if (companyId) {
                console.log(`🚀 AUTO-NAVIGATING to company page: ${companyId}`);
                
                setTimeout(() => {
                  toast({
                    title: '🏢 Redirecting to Company Page',
                    description: `Taking you to ${companyName}'s detailed analysis...`,
                  });
                  
                  // Navigate to the company page
                  navigate(`/company/${companyId}`);
                }, 2000); // 2 second delay to show completion message
              }
            } else if (newStatus === 'failed' || newStatus === 'error') {
              console.log(`❌ ANALYSIS FAILED for ${companyName}`);
              
              toast({
                title: '❌ Analysis Failed',
                description: `Analysis failed for ${companyName}. Please try again.`,
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 BARC submissions realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ BARC realtime subscription is ACTIVE');
        } else if (status === 'CLOSED') {
          console.log('❌ BARC realtime subscription CLOSED');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('💥 BARC realtime subscription ERROR');
        }
      });
    
    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      supabase.removeChannel(emailChannel);
      supabase.removeChannel(barcChannel);
    };
  }, [navigate]);

  // This component doesn't render anything
  return null;
}
