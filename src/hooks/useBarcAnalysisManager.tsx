
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisState {
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  companyId?: string;
  startTime: number;
}

export const useBarcAnalysisManager = () => {
  const [activeAnalyses, setActiveAnalyses] = useState<Map<string, AnalysisState>>(new Map());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pollIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Enhanced realtime listener with immediate state updates
  useEffect(() => {
    console.log('📡 Setting up BARC analysis manager realtime listeners');
    
    const handleBarcStatusChange = (event: CustomEvent) => {
      const { submissionId, status, companyId } = event.detail;
      console.log(`🔄 Analysis manager - Real-time status update: ${submissionId} -> ${status}`);
      
      // Update local state immediately
      setActiveAnalyses(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(submissionId);
        if (current) {
          newMap.set(submissionId, {
            ...current,
            status,
            companyId
          });
        }
        return newMap;
      });

      // Stop polling if analysis is complete
      if (status === 'completed' || status === 'failed') {
        console.log(`✅ Analysis ${status} - stopping polling for ${submissionId}`);
        stopAnalysis(submissionId);
        
        if (status === 'completed' && companyId) {
          handleAnalysisComplete(submissionId, companyId);
        } else if (status === 'failed') {
          handleAnalysisFailed(submissionId);
        }
      }
    };

    window.addEventListener('barcStatusChange', handleBarcStatusChange as EventListener);

    return () => {
      window.removeEventListener('barcStatusChange', handleBarcStatusChange as EventListener);
      // Cleanup all intervals
      pollIntervals.current.forEach(interval => clearInterval(interval));
      pollIntervals.current.clear();
    };
  }, [queryClient, navigate]);

  // Start tracking an analysis with minimal polling (realtime should handle most updates)
  const startAnalysis = useCallback((submissionId: string) => {
    console.log('🚀 Starting analysis tracking for:', submissionId);
    
    setActiveAnalyses(prev => {
      const newMap = new Map(prev);
      newMap.set(submissionId, {
        submissionId,
        status: 'processing',
        startTime: Date.now()
      });
      return newMap;
    });

    // Lightweight fallback polling (only as backup to realtime)
    const pollInterval = setInterval(async () => {
      try {
        console.log(`🔍 Backup polling for ${submissionId}`);
        
        const { data, error } = await supabase
          .from('barc_form_submissions')
          .select('analysis_status, company_id')
          .eq('id', submissionId)
          .single();

        if (error) {
          console.error('❌ Backup polling error:', error);
          return;
        }

        if (data) {
          const newStatus = data.analysis_status as 'pending' | 'processing' | 'completed' | 'failed';
          console.log(`📊 Backup polled status for ${submissionId}: ${newStatus}`);
          
          // Only process if realtime hasn't already handled it
          setActiveAnalyses(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(submissionId);
            if (current && current.status !== newStatus) {
              console.log(`🔄 Backup update: ${current.status} to ${newStatus}`);
              newMap.set(submissionId, {
                ...current,
                status: newStatus,
                companyId: data.company_id
              });
              
              // If complete, handle it
              if (newStatus === 'completed' || newStatus === 'failed') {
                setTimeout(() => {
                  stopAnalysis(submissionId);
                  if (newStatus === 'completed' && data.company_id) {
                    handleAnalysisComplete(submissionId, data.company_id);
                  } else if (newStatus === 'failed') {
                    handleAnalysisFailed(submissionId);
                  }
                }, 100);
              }
            }
            return newMap;
          });
        }
      } catch (error) {
        console.error('❌ Backup polling error:', error);
      }
    }, 5000); // Poll every 5 seconds as backup

    pollIntervals.current.set(submissionId, pollInterval);

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      if (pollIntervals.current.has(submissionId)) {
        console.log('⏰ Auto-cleanup polling for:', submissionId);
        stopAnalysis(submissionId);
      }
    }, 600000);
  }, [queryClient]);

  // Stop tracking an analysis
  const stopAnalysis = useCallback((submissionId: string) => {
    console.log('🛑 Stopping analysis tracking for:', submissionId);
    
    const interval = pollIntervals.current.get(submissionId);
    if (interval) {
      clearInterval(interval);
      pollIntervals.current.delete(submissionId);
    }

    setActiveAnalyses(prev => {
      const newMap = new Map(prev);
      newMap.delete(submissionId);
      return newMap;
    });
  }, []);

  // Handle successful completion
  const handleAnalysisComplete = useCallback(async (submissionId: string, companyId: string) => {
    console.log('🎉 Analysis completed successfully:', submissionId, 'Company:', companyId);
    
    // Show success notification
    toast.success("Analysis completed successfully!", {
      description: "Redirecting to company page...",
      duration: 3000
    });

    // Navigate to company page after a short delay
    setTimeout(() => {
      navigate(`/company/${companyId}`);
    }, 1500);
  }, [navigate]);

  // Handle failed analysis
  const handleAnalysisFailed = useCallback((submissionId: string) => {
    console.log('❌ Analysis failed for:', submissionId);
    
    toast.error("Analysis failed", {
      description: "There was an error processing the submission.",
      duration: 5000
    });
  }, []);

  // Get current status of a submission
  const getAnalysisStatus = useCallback((submissionId: string) => {
    return activeAnalyses.get(submissionId);
  }, [activeAnalyses]);

  // Check if a submission is being analyzed
  const isAnalyzing = useCallback((submissionId: string) => {
    const analysis = activeAnalyses.get(submissionId);
    return analysis?.status === 'processing';
  }, [activeAnalyses]);

  return {
    startAnalysis,
    stopAnalysis,
    getAnalysisStatus,
    isAnalyzing,
    activeAnalyses: Array.from(activeAnalyses.values())
  };
};
