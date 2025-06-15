
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function RealtimeSubscriptions() {
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

    // Subscribe to BARC form submissions - STATUS UPDATES ONLY (NO ANALYSIS TRIGGER)
    console.log('🎯 Setting up BARC form submissions realtime subscription for STATUS UPDATES...');
    
    const barcChannel = supabase
      .channel('barc_form_submissions_status_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🚀 NEW BARC FORM SUBMISSION DETECTED - SHOWING NOTIFICATION ONLY:', payload);
          
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const submitterEmail = payload.new.submitter_email;
          
          console.log(`📋 Submission details for notification:`, {
            id: submissionId,
            company: companyName,
            email: submitterEmail,
            status: payload.new.analysis_status,
            timestamp: new Date().toISOString()
          });
          
          // Show notification only - analysis is triggered from form submission
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
          console.log('📊 BARC submission status updated:', payload);
          
          const oldStatus = payload.old.analysis_status;
          const newStatus = payload.new.analysis_status;
          
          // Show toast notifications for status changes
          if (oldStatus !== newStatus) {
            console.log(`📈 Status change: ${oldStatus} → ${newStatus} for ${payload.new.company_name}`);
            
            if (newStatus === 'processing') {
              toast({
                title: '🔄 Analysis In Progress',
                description: `Analysis is now running for ${payload.new.company_name}`,
              });
            } else if (newStatus === 'completed') {
              toast({
                title: '✅ Analysis Completed',
                description: `Analysis successfully completed for ${payload.new.company_name}`,
              });
            } else if (newStatus === 'failed' || newStatus === 'error') {
              toast({
                title: '❌ Analysis Failed',
                description: `Analysis failed for ${payload.new.company_name}`,
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 BARC submissions realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ BARC realtime subscription is ACTIVE for status updates');
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
  }, []);

  // This component doesn't render anything
  return null;
}
