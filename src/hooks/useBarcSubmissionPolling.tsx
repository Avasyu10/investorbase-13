
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const MAX_POLL_ATTEMPTS = 180; // 3 minutes of polling (1 second intervals)

  const pollSubmissionStatus = async () => {
    try {
      console.log(`🔍 Polling status for submission ${submissionId}, attempt ${maxPollAttemptsRef.current + 1}/${MAX_POLL_ATTEMPTS}`);
      
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('analysis_status, company_id')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('Error polling submission status:', error);
        return;
      }

      if (data) {
        console.log(`📊 Polled status: ${data.analysis_status}, company_id: ${data.company_id}`);
        
        // If status has changed to completed or failed, stop polling and notify
        if (data.analysis_status === 'completed' || data.analysis_status === 'failed' || data.analysis_status === 'error') {
          console.log(`✅ Analysis completed with status: ${data.analysis_status}`);
          setIsPolling(false);
          onStatusChange(data.analysis_status, data.company_id);
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
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
      console.error('Error during polling:', error);
    }
  };

  const startPolling = () => {
    if (isPolling || pollIntervalRef.current) {
      console.log('Polling already active, skipping...');
      return;
    }

    console.log(`🚀 Starting polling for submission ${submissionId}`);
    setIsPolling(true);
    maxPollAttemptsRef.current = 0;
    
    // Start immediate polling every second
    pollIntervalRef.current = setInterval(pollSubmissionStatus, 1000);
    
    // Also poll immediately
    pollSubmissionStatus();
  };

  const stopPolling = () => {
    console.log('🛑 Stopping polling');
    setIsPolling(false);
    maxPollAttemptsRef.current = 0;
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

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
  }, [isAnalyzing, submissionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isPolling,
    stopPolling
  };
};
