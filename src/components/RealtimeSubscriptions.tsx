
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

    // Subscribe to BARC form submissions - ENHANCED AUTOMATIC ANALYSIS TRIGGER
    console.log('🎯 Setting up BARC form submissions realtime subscription for AUTOMATIC ANALYSIS...');
    
    const barcChannel = supabase
      .channel('barc_form_submissions_realtime_auto_analyze')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('🚀 NEW BARC FORM SUBMISSION DETECTED - TRIGGERING AUTOMATIC ANALYSIS:', payload);
          
          const submissionId = payload.new.id;
          const companyName = payload.new.company_name;
          const submitterEmail = payload.new.submitter_email;
          
          console.log(`📋 Submission details for automatic analysis:`, {
            id: submissionId,
            company: companyName,
            email: submitterEmail,
            status: payload.new.analysis_status,
            timestamp: new Date().toISOString()
          });
          
          // Show immediate notification for new submission
          toast({
            title: '🎯 New BARC Application Received',
            description: `Application from ${companyName || 'unknown company'} - starting automatic analysis...`,
          });
          
          // IMMEDIATE ANALYSIS TRIGGER with retry logic
          console.log(`🔬 STARTING AUTOMATIC ANALYSIS for submission: ${submissionId}`);
          
          const triggerAnalysis = async (retryCount = 0) => {
            try {
              console.log(`🚀 Attempt ${retryCount + 1}: Invoking analyze-barc-form function for automatic analysis...`);
              
              const response = await supabase.functions.invoke('analyze-barc-form', {
                body: { 
                  submissionId,
                  autoTrigger: true,
                  timestamp: new Date().toISOString()
                }
              });
              
              console.log('✅ BARC analysis function response:', response);
              
              if (response.error) {
                console.error('❌ Error from BARC analysis function:', response.error);
                
                // Check if it's a lock/processing error (not a real error)
                if (response.error.message?.includes('already being analyzed') || 
                    response.error.message?.includes('already being processed')) {
                  console.log('ℹ️ Submission already being processed (this is expected)');
                  toast({
                    title: '⚡ Analysis Already Started',
                    description: `Analysis for ${companyName} is already in progress.`,
                  });
                  return;
                }
                
                // Retry logic for temporary failures
                if (retryCount < 2) {
                  console.log(`🔄 Retrying analysis trigger in 2 seconds... (attempt ${retryCount + 2})`);
                  setTimeout(() => triggerAnalysis(retryCount + 1), 2000);
                  return;
                }
                
                toast({
                  title: '⚠️ Analysis Failed to Start',
                  description: `Failed to start automatic analysis for ${companyName}: ${response.error.message}`,
                  variant: "destructive",
                });
              } else {
                console.log('🎉 BARC analysis started successfully via automatic trigger');
                
                toast({
                  title: '⚡ Analysis Started Automatically',
                  description: `Analysis is now running for ${companyName}. You'll be notified when complete.`,
                });
              }
            } catch (error) {
              console.error('💥 Error starting automatic BARC analysis:', error);
              
              // Retry logic for network errors
              if (retryCount < 2) {
                console.log(`🔄 Retrying analysis trigger due to error in 3 seconds... (attempt ${retryCount + 2})`);
                setTimeout(() => triggerAnalysis(retryCount + 1), 3000);
                return;
              }
              
              toast({
                title: '❌ Automatic Analysis Failed',
                description: `Failed to start analysis for ${companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive",
              });
            }
          };
          
          // Start analysis with a small delay to ensure database transaction is committed
          setTimeout(() => triggerAnalysis(), 1000);
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
          console.log('✅ BARC realtime subscription is ACTIVE and ready to trigger automatic analysis');
        } else if (status === 'CLOSED') {
          console.log('❌ BARC realtime subscription CLOSED - automatic analysis will not work');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('💥 BARC realtime subscription ERROR - automatic analysis may not work');
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
