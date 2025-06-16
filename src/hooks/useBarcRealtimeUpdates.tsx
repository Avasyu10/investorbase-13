
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BarcRealtimeUpdatesProps {
  onStatusChange?: (submissionId: string, status: string, companyId?: string) => void;
  onNewSubmission?: () => void;
}

export const useBarcRealtimeUpdates = ({ 
  onStatusChange, 
  onNewSubmission 
}: BarcRealtimeUpdatesProps = {}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleStatusUpdate = useCallback(async (payload: any) => {
    const { new: newData, old: oldData } = payload;
    const submissionId = newData.id;
    const newStatus = newData.analysis_status;
    const oldStatus = oldData?.analysis_status;
    const companyId = newData.company_id;
    const companyName = newData.company_name;

    console.log(`🔄 BARC Status Update: ${submissionId} from ${oldStatus} to ${newStatus}`);

    // Immediately invalidate all relevant queries
    console.log('🔄 Invalidating all submission queries...');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['barc-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['public-submissions'] }),
      queryClient.refetchQueries({ queryKey: ['barc-submissions'] }),
      queryClient.refetchQueries({ queryKey: ['public-submissions'] })
    ]);
    console.log('✅ Queries invalidated and refetched');

    // Dispatch custom event for immediate UI updates
    const customEvent = new CustomEvent('barcStatusChange', {
      detail: { submissionId, status: newStatus, companyId, companyName }
    });
    window.dispatchEvent(customEvent);

    // Call callback if provided
    if (onStatusChange) {
      onStatusChange(submissionId, newStatus, companyId);
    }

    // Handle completion
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      console.log('🎉 Analysis completed for:', companyName);
      
      toast.success("✅ Analysis Complete!", {
        description: `Analysis completed for ${companyName}. Click to view results.`,
        duration: 5000,
        action: companyId ? {
          label: "View Company",
          onClick: () => navigate(`/company/${companyId}`)
        } : undefined
      });

      // Auto-redirect after delay if company ID exists
      if (companyId) {
        setTimeout(() => {
          console.log(`🚀 Auto-redirecting to company: ${companyId}`);
          navigate(`/company/${companyId}`);
        }, 3000);
      }
    } else if (newStatus === 'failed' || newStatus === 'error') {
      console.log('❌ Analysis failed for:', companyName);
      toast.error("❌ Analysis Failed", {
        description: `Analysis failed for ${companyName}. Please try again.`,
        duration: 5000
      });
    }
  }, [queryClient, navigate, onStatusChange]);

  const handleNewSubmission = useCallback(async (payload: any) => {
    console.log('🆕 New BARC submission:', payload.new);
    
    // Invalidate queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['barc-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['public-submissions'] }),
      queryClient.refetchQueries({ queryKey: ['barc-submissions'] }),
      queryClient.refetchQueries({ queryKey: ['public-submissions'] })
    ]);

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('barcNewSubmission', {
      detail: payload.new
    }));

    // Call callback if provided
    if (onNewSubmission) {
      onNewSubmission();
    }

    toast.info("📥 New Application", {
      description: "A new BARC application has been submitted.",
      duration: 3000
    });
  }, [queryClient, onNewSubmission]);

  useEffect(() => {
    console.log('📡 Setting up enhanced BARC realtime subscriptions');

    const channel = supabase
      .channel('barc_realtime_enhanced')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        handleStatusUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        handleNewSubmission
      )
      .subscribe((status) => {
        console.log('📡 Enhanced BARC realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced BARC realtime active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ BARC realtime subscription error');
          toast.error("Real-time updates disconnected", {
            description: "Please refresh the page to restore live updates."
          });
        }
      });

    return () => {
      console.log('🧹 Cleaning up enhanced BARC realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [handleStatusUpdate, handleNewSubmission]);

  return null;
};
