
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const RealtimeSubscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<any[]>([]);

  const cleanupChannels = () => {
    channelsRef.current.forEach(channel => {
      console.log('Cleaning up channel:', channel.topic);
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Don't set up redirects if user is on the thank you page
    const isOnThankYouPage = location.pathname === '/thank-you';

    console.log('Setting up realtime subscriptions for user:', user.id);

    // Clean up existing channels first
    cleanupChannels();

    // Subscribe to eureka form submissions
    const eurekaChannel = supabase
      .channel(`eureka_submissions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'eureka_form_submissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Eureka submission updated:', payload);
          const submission = payload.new as any;
          
          if (submission.analysis_status === 'completed' && submission.company_id) {
            toast({
              title: "Analysis Complete",
              description: "Your Eureka form submission has been analyzed successfully!",
            });
            
            if (!isOnThankYouPage) {
              navigate(`/company/${submission.company_id}`);
            }
          } else if (submission.analysis_status === 'failed') {
            toast({
              title: "Analysis Failed",
              description: "There was an error analyzing your submission. Please try again.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Eureka channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('Eureka channel error, will retry...');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscriptions();
          }, 5000);
        }
      });

    // Subscribe to BARC form submissions
    const barcChannel = supabase
      .channel(`barc_submissions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barc_form_submissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('BARC submission updated:', payload);
          const submission = payload.new as any;
          
          if (submission.analysis_status === 'completed' && submission.company_id) {
            toast({
              title: "Analysis Complete",
              description: "Your BARC form submission has been analyzed successfully!",
            });
            
            if (!isOnThankYouPage) {
              navigate(`/company/${submission.company_id}`);
            }
          } else if (submission.analysis_status === 'failed') {
            toast({
              title: "Analysis Failed",
              description: "There was an error analyzing your submission. Please try again.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('BARC channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('BARC channel error, will retry...');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscriptions();
          }, 5000);
        }
      });

    // Subscribe to email pitch submissions
    const emailPitchChannel = supabase
      .channel(`email_pitch_submissions_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_pitch_submissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Email pitch submission updated:', payload);
          const submission = payload.new as any;
          
          if (submission.analysis_status === 'completed' && submission.company_id) {
            toast({
              title: "Analysis Complete",
              description: "Your email pitch has been analyzed successfully!",
            });
            
            if (!isOnThankYouPage) {
              navigate(`/company/${submission.company_id}`);
            }
          } else if (submission.analysis_status === 'failed') {
            toast({
              title: "Analysis Failed",
              description: "There was an error analyzing your email pitch. Please try again.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Email pitch channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.log('Email pitch channel error, will retry...');
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscriptions();
          }, 5000);
        }
      });

    // Store channels for cleanup
    channelsRef.current = [eurekaChannel, barcChannel, emailPitchChannel];
  };

  useEffect(() => {
    setupRealtimeSubscriptions();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      cleanupChannels();
    };
  }, [user, navigate, toast, location.pathname]);

  return null;
};
