
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseBarcSubmissionPollingProps {
  submissionId: string;
  isAnalyzing: boolean;
  onStatusChange: (status: string, companyId?: string) => void;
}

export const useBarcSubmissionPolling = ({ 
  submissionId, 
  isAnalyzing, 
  onStatusChange 
}: UseBarcSubmissionPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollAttemptsRef = useRef(0);
  const lastStatusRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const MAX_POLL_ATTEMPTS = 300; // 5 minutes of polling

  const pollSubmissionStatus = useCallback(async () => {
    if (!submissionId) {
      console.log('❌ No submission ID provided for polling');
      return;
    }

    try {
      console.log(`🔍 Polling status for submission ${submissionId}, attempt ${maxPollAttemptsRef.current + 1}/${MAX_POLL_ATTEMPTS}`);
      
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('analysis_status, company_id, analysis_result')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('❌ Error polling submission status:', error);
        return;
      }

      if (data) {
        const currentStatus = data.analysis_status;
        const previousStatus = lastStatusRef.current;
        
        console.log(`📊 Polled status: ${currentStatus} (previous: ${previousStatus}), company_id: ${data.company_id}`);
        
        // Update last status reference
        lastStatusRef.current = currentStatus;
        
        // IMMEDIATE cache invalidation for any status change
        if (currentStatus !== previousStatus) {
          console.log('🔥 Status changed - forcing IMMEDIATE cache updates');
          
          // Invalidate all submission-related queries immediately
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

          // Force immediate refetch
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
        }
        
        // If status has changed to completed or failed, stop polling and notify
        if (currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'error') {
          console.log(`✅ Analysis ${currentStatus} - stopping polling and notifying`);
          setIsPolling(false);
          
          // Clear interval first
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Final cache update
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
          
          // Notify with status change
          onStatusChange(currentStatus, data.company_id);
          return;
        }
      }

      maxPollAttemptsRef.current += 1;
      
      // Stop polling after max attempts
      if (maxPollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        console.log('⏰ Max polling attempts reached, stopping polling');
        setIsPolling(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error('❌ Error during polling:', error);
    }
  }, [submissionId, onStatusChange, queryClient]);

  const startPolling = useCallback(() => {
    if (isPolling || pollIntervalRef.current) {
      console.log('⏩ Polling already active, skipping...');
      return;
    }

    if (!submissionId) {
      console.log('❌ Cannot start polling without submission ID');
      return;
    }

    console.log(`🚀 Starting polling for submission ${submissionId}`);
    setIsPolling(true);
    maxPollAttemptsRef.current = 0;
    lastStatusRef.current = null;
    
    // Start immediate polling every 2 seconds (faster for better responsiveness)
    pollIntervalRef.current = setInterval(pollSubmissionStatus, 2000);
    
    // Also poll immediately
    pollSubmissionStatus();
  }, [submissionId, pollSubmissionStatus, isPolling]);

  const stopPolling = useCallback(() => {
    console.log('🛑 Stopping polling');
    setIsPolling(false);
    maxPollAttemptsRef.current = 0;
    lastStatusRef.current = null;
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Start polling when analysis begins
  useEffect(() => {
    if (isAnalyzing && submissionId) {
      startPolling();
    } else if (!isAnalyzing) {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isAnalyzing, submissionId, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isPolling,
    stopPolling
  };
};
