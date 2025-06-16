
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PollingConfig {
  enabled: boolean;
  interval: number;
  maxAttempts: number;
}

interface UseSubmissionPollingProps {
  submissionIds: string[];
  config?: Partial<PollingConfig>;
  onStatusChange?: (submissionId: string, status: string, companyId?: string) => void;
}

const DEFAULT_CONFIG: PollingConfig = {
  enabled: true,
  interval: 3000, // 3 seconds
  maxAttempts: 200 // 10 minutes total
};

export const useSubmissionPolling = ({ 
  submissionIds, 
  config = {}, 
  onStatusChange 
}: UseSubmissionPollingProps) => {
  const queryClient = useQueryClient();
  const pollConfig = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  const pollSubmissions = useCallback(async () => {
    if (!pollConfig.enabled || submissionIds.length === 0 || attemptsRef.current >= pollConfig.maxAttempts) {
      return;
    }

    try {
      console.log(`🔍 Polling ${submissionIds.length} submissions (attempt ${attemptsRef.current + 1})`);
      
      const { data, error } = await supabase
        .from('barc_form_submissions')
        .select('id, analysis_status, company_id, company_name')
        .in('id', submissionIds)
        .in('analysis_status', ['processing', 'pending']);

      if (error) {
        console.error('❌ Polling error:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`📊 Polled ${data.length} submissions still processing`);
        
        // Check if any are completed (not in the results = completed)
        const polledIds = data.map(d => d.id);
        const completedIds = submissionIds.filter(id => !polledIds.includes(id));
        
        if (completedIds.length > 0) {
          console.log(`✅ Found ${completedIds.length} completed submissions`);
          
          // Fetch completed submissions to get company info
          const { data: completedData } = await supabase
            .from('barc_form_submissions')
            .select('id, analysis_status, company_id, company_name')
            .in('id', completedIds);

          if (completedData) {
            completedData.forEach(submission => {
              if (onStatusChange) {
                onStatusChange(submission.id, submission.analysis_status, submission.company_id);
              }
            });
          }
        }
      }

      attemptsRef.current += 1;
    } catch (error) {
      console.error('❌ Polling error:', error);
      attemptsRef.current += 1;
    }
  }, [submissionIds, pollConfig, onStatusChange]);

  const startPolling = useCallback(() => {
    if (intervalRef.current || !pollConfig.enabled) return;
    
    console.log('🚀 Starting submission polling');
    attemptsRef.current = 0;
    intervalRef.current = setInterval(pollSubmissions, pollConfig.interval);
    
    // Poll immediately
    pollSubmissions();
  }, [pollSubmissions, pollConfig.enabled, pollConfig.interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log('🛑 Stopping submission polling');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    attemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (submissionIds.length > 0 && pollConfig.enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [submissionIds, pollConfig.enabled, startPolling, stopPolling]);

  return { startPolling, stopPolling };
};
