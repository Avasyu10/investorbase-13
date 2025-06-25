
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseEurekaSubmissionPollingProps {
  submissionId: string;
  isAnalyzing: boolean;
  onStatusChange: (status: string, companyId?: string) => void;
}

export const useEurekaSubmissionPolling = ({ 
  submissionId, 
  isAnalyzing, 
  onStatusChange 
}: UseEurekaSubmissionPollingProps) => {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const MAX_POLL_ATTEMPTS = 150; // 5 minutes with 2-second intervals
  const attemptsRef = useRef(0);

  const pollSubmissionStatus = useCallback(async () => {
    if (!submissionId || attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      return;
    }

    try {
      console.log(`🔍 Polling Eureka submission ${submissionId} (attempt ${attemptsRef.current + 1})`);
      
      const { data, error } = await supabase
        .from('eureka_form_submissions')
        .select('analysis_status, company_id')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('❌ Polling error:', error);
        return;
      }

      if (data) {
        const status = data.analysis_status;
        console.log(`📊 Polled status: ${status}, company_id: ${data.company_id}`);
        
        // If analysis is complete or failed, stop polling and notify
        if (status === 'completed' || status === 'failed' || status === 'error') {
          console.log(`✅ Analysis ${status} - stopping polling`);
          stopPolling();
          
          // Invalidate queries to refresh UI
          await queryClient.invalidateQueries({ 
            queryKey: ['eureka-submissions'],
            refetchType: 'all'
          });
          
          onStatusChange(status, data.company_id);
          return;
        }
      }

      attemptsRef.current += 1;
    } catch (error) {
      console.error('❌ Polling error:', error);
      attemptsRef.current += 1;
    }
  }, [submissionId, onStatusChange, queryClient]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current || !submissionId) {
      return;
    }

    console.log(`🚀 Starting Eureka polling for ${submissionId}`);
    attemptsRef.current = 0;
    
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollSubmissionStatus, 2000);
    
    // Poll immediately
    pollSubmissionStatus();
  }, [submissionId, pollSubmissionStatus]);

  const stopPolling = useCallback(() => {
    console.log('🛑 Stopping Eureka polling');
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    attemptsRef.current = 0;
  }, []);

  // Start/stop polling based on isAnalyzing
  useEffect(() => {
    if (isAnalyzing && submissionId) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [isAnalyzing, submissionId, startPolling, stopPolling]);

  return { stopPolling };
};
