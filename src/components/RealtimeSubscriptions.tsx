
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const RealtimeSubscriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Don't set up redirects if user is on the thank you page (public form completion)
    const isOnThankYouPage = location.pathname === '/thank-you';

    console.log('Setting up realtime subscriptions for user:', user.id);

    // Subscribe to eureka form submissions
    const eurekaChannel = supabase
      .channel('eureka_submissions')
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
            
            // Only redirect if not on thank you page
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
      .subscribe();

    // Subscribe to BARC form submissions
    const barcChannel = supabase
      .channel('barc_submissions')
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
            
            // Only redirect if not on thank you page
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
      .subscribe();

    // Subscribe to email pitch submissions
    const emailPitchChannel = supabase
      .channel('email_pitch_submissions')
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
            
            // Only redirect if not on thank you page
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
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(eurekaChannel);
      supabase.removeChannel(barcChannel);
      supabase.removeChannel(emailPitchChannel);
    };
  }, [user, navigate, toast, location.pathname]);

  return null;
};
