
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PublicSubmissionsTable } from "./PublicSubmissionsTable";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CombinedSubmission {
  id: string;
  company_name: string;
  submitter_email: string;
  created_at: string;
  source: 'public_form' | 'barc_form' | 'email' | 'eureka_form';
  analysis_status?: string;
  form_slug?: string;
  sender_email?: string;
  from_email?: string;
  has_attachment?: boolean;
  analysis_result?: any;
  user_id?: string;
  company_id?: string;
}

export function PublicSubmissionsList() {
  const [submissions, setSubmissions] = useState<CombinedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    if (!user) {
      console.log('No user found, skipping submissions fetch');
      setSubmissions([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching submissions for user:', user.id, 'email:', user.email);
      
      // Get user's owned form slugs
      const { data: userForms, error: formsError } = await supabase
        .from('public_submission_forms')
        .select('form_slug')
        .eq('user_id', user.id);

      if (formsError) {
        console.error('Error fetching user forms:', formsError);
        throw formsError;
      }

      const userFormSlugs = userForms?.map(form => form.form_slug) || [];
      console.log('User owned form slugs:', userFormSlugs);

      let allSubmissions: CombinedSubmission[] = [];

      // Fetch public form submissions for user's forms
      if (userFormSlugs.length > 0) {
        console.log('Fetching public form submissions for user\'s forms...');
        const { data: publicSubmissions, error: publicError } = await supabase
          .from('public_form_submissions')
          .select('*')
          .in('form_slug', userFormSlugs)
          .order('created_at', { ascending: false });

        if (publicError) {
          console.error('Error fetching public submissions:', publicError);
        } else {
          console.log('Public form submissions fetched:', publicSubmissions?.length || 0);
          const mappedPublicSubmissions: CombinedSubmission[] = (publicSubmissions || []).map(sub => ({
            id: sub.id,
            company_name: sub.title || 'Untitled Submission',
            submitter_email: sub.submitter_email || sub.founder_email || 'No email',
            created_at: sub.created_at,
            source: 'public_form' as const,
            form_slug: sub.form_slug,
            user_id: undefined,
            company_id: undefined
          }));
          allSubmissions = [...allSubmissions, ...mappedPublicSubmissions];
        }
      }

      // Fetch BARC form submissions for user's forms
      if (userFormSlugs.length > 0) {
        console.log('Fetching BARC form submissions for user\'s forms...');
        const { data: barcSubmissions, error: barcError } = await supabase
          .from('barc_form_submissions')
          .select('*')
          .in('form_slug', userFormSlugs)
          .order('created_at', { ascending: false });

        if (barcError) {
          console.error('Error fetching BARC submissions:', barcError);
        } else {
          console.log('BARC form submissions fetched:', barcSubmissions?.length || 0);
          const mappedBarcSubmissions: CombinedSubmission[] = (barcSubmissions || []).map(sub => ({
            id: sub.id,
            company_name: sub.company_name || 'Untitled Company',
            submitter_email: sub.submitter_email || 'No email',
            created_at: sub.created_at,
            source: 'barc_form' as const,
            analysis_status: sub.analysis_status,
            form_slug: sub.form_slug,
            analysis_result: sub.analysis_result,
            user_id: sub.user_id,
            company_id: sub.company_id
          }));
          allSubmissions = [...allSubmissions, ...mappedBarcSubmissions];
        }
      }

      // Fetch Eureka form submissions for user's forms
      if (userFormSlugs.length > 0) {
        console.log('Fetching Eureka form submissions for user\'s forms...');
        const { data: eurekaSubmissions, error: eurekaError } = await supabase
          .from('eureka_form_submissions')
          .select('*')
          .in('form_slug', userFormSlugs)
          .order('created_at', { ascending: false });

        if (eurekaError) {
          console.error('Error fetching Eureka submissions:', eurekaError);
        } else {
          console.log('Eureka form submissions fetched:', eurekaSubmissions?.length || 0);
          const mappedEurekaSubmissions: CombinedSubmission[] = (eurekaSubmissions || []).map(sub => ({
            id: sub.id,
            company_name: sub.company_name || 'Untitled Company',
            submitter_email: sub.submitter_email || 'No email',
            created_at: sub.created_at,
            source: 'eureka_form' as const,
            analysis_status: sub.analysis_status,
            form_slug: sub.form_slug,
            analysis_result: sub.analysis_result,
            user_id: sub.user_id,
            company_id: sub.company_id
          }));
          allSubmissions = [...allSubmissions, ...mappedEurekaSubmissions];
        }
      }

      // Fetch email submissions
      console.log('Fetching email submissions...');
      const { data: emailSubmissions, error: emailError } = await supabase
        .from('email_pitch_submissions')
        .select('*')
        .eq('sender_email', user.email)
        .order('created_at', { ascending: false });

      if (emailError) {
        console.error('Error fetching email submissions:', emailError);
      } else {
        console.log('Email submissions fetched:', emailSubmissions?.length || 0);
        const mappedEmailSubmissions: CombinedSubmission[] = (emailSubmissions || []).map(sub => ({
          id: sub.id,
          company_name: sub.company_name || 'Email Submission',
          submitter_email: sub.sender_email,
          created_at: sub.created_at,
          source: 'email' as const,
          analysis_status: sub.analysis_status,
          sender_email: sub.sender_email,
          has_attachment: sub.has_attachment,
          user_id: undefined,
          company_id: undefined
        }));
        allSubmissions = [...allSubmissions, ...mappedEmailSubmissions];
      }

      // Sort all submissions by created_at (most recent first) and remove duplicates
      const uniqueSubmissions = allSubmissions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .filter((submission, index, self) => 
          index === self.findIndex(s => s.id === submission.id)
        );

      console.log('Final submissions count after deduplication:', uniqueSubmissions.length);
      console.log('Submissions by source:', {
        public_form: uniqueSubmissions.filter(s => s.source === 'public_form').length,
        barc_form: uniqueSubmissions.filter(s => s.source === 'barc_form').length,
        eureka_form: uniqueSubmissions.filter(s => s.source === 'eureka_form').length,
        email: uniqueSubmissions.filter(s => s.source === 'email').length
      });

      setSubmissions(uniqueSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch submissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubmissions();
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  // Set up real-time subscriptions for all submission types
  useEffect(() => {
    if (!user) return;

    console.log('📡 Setting up enhanced realtime listeners for PublicSubmissionsList');

    const channels = [];

    // Listen to public form submissions
    const publicChannel = supabase
      .channel('public-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_form_submissions'
        },
        (payload) => {
          console.log('📡 Public form submission change:', payload);
          fetchSubmissions();
        }
      )
      .subscribe();
    channels.push(publicChannel);

    // Listen to BARC form submissions
    const barcChannel = supabase
      .channel('barc-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barc_form_submissions'
        },
        (payload) => {
          console.log('📡 BARC form submission change:', payload);
          fetchSubmissions();
        }
      )
      .subscribe();
    channels.push(barcChannel);

    // Listen to Eureka form submissions
    const eurekaChannel = supabase
      .channel('eureka-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eureka_form_submissions'
        },
        (payload) => {
          console.log('📡 Eureka form submission change:', payload);
          fetchSubmissions();
        }
      )
      .subscribe();
    channels.push(eurekaChannel);

    // Listen to email pitch submissions
    const emailChannel = supabase
      .channel('email-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_pitch_submissions'
        },
        (payload) => {
          console.log('📡 Email submission change:', payload);
          fetchSubmissions();
        }
      )
      .subscribe();
    channels.push(emailChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">New Applications ({submissions.length})</h2>
          <p className="text-muted-foreground">
            Recent submissions across all your forms and channels
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No submissions yet</h3>
          <p className="mt-2 text-muted-foreground">
            New applications will appear here when submitted through your forms or email
          </p>
        </div>
      ) : (
        <PublicSubmissionsTable submissions={submissions} />
      )}
    </div>
  );
}
