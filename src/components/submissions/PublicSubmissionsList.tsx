import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { PublicSubmissionsTable } from "./PublicSubmissionsTable";
import { IITBombaySubmissionsTable } from "./IITBombaySubmissionsTable";
import { Loader2, Inbox, RefreshCw, Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { CombinedSubmission } from "./types";

export function PublicSubmissionsList() {
  const [submissions, setSubmissions] = useState<CombinedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalApplications, setTotalApplications] = useState<number | null>(null);
  const [globalStatusCounts, setGlobalStatusCounts] = useState<{ analyzed: number; rejected: number; processing: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'pending' | 'processing'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  const { user } = useAuth();
  const { isIITBombay } = useProfile();
  const { toast } = useToast();

  const fetchSubmissions = async (page: number = currentPage, filter: string = statusFilter) => {
    if (!user) {
      console.log('No user found, skipping submissions fetch');
      setSubmissions([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching submissions for user:', user.id, 'email:', user.email, 'page:', page, 'filter:', filter);
      
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

      // Fetch total counts and status counts efficiently (no row data)
      try {
        const createCountQuery = (table: string) => {
          // Use any to avoid TS literal union issues for dynamic table names
          let q: any = supabase.from(table as any).select('id', { count: 'exact', head: true });
          if (table === 'barc_form_submissions' || table === 'eureka_form_submissions') {
            if (userFormSlugs.length > 0) {
              q = q.or(`form_slug.in.(${userFormSlugs.join(',')}),user_id.eq.${user.id}`);
            } else {
              q = q.eq('user_id', user.id);
            }
          }
          if (table === 'email_pitch_submissions') {
            q = q.eq('sender_email', user.email);
          }
          if (table === 'public_form_submissions') {
            q = q.in('form_slug', userFormSlugs);
          }
          return q;
        };

        const [
          publicTotalRes,
          barcTotalRes,
          eurekaTotalRes,
          emailTotalRes,
          barcCompletedRes,
          barcFailedRes,
          eurekaCompletedRes,
          eurekaFailedRes,
          emailCompletedRes,
          emailFailedRes,
        ] = await Promise.all([
          userFormSlugs.length > 0 ? createCountQuery('public_form_submissions') : Promise.resolve({ count: 0 } as any),
          createCountQuery('barc_form_submissions'),
          createCountQuery('eureka_form_submissions'),
          createCountQuery('email_pitch_submissions'),
          createCountQuery('barc_form_submissions').eq('analysis_status', 'completed'),
          createCountQuery('barc_form_submissions').eq('analysis_status', 'failed'),
          createCountQuery('eureka_form_submissions').eq('analysis_status', 'completed'),
          createCountQuery('eureka_form_submissions').eq('analysis_status', 'failed'),
          createCountQuery('email_pitch_submissions').eq('analysis_status', 'completed'),
          createCountQuery('email_pitch_submissions').eq('analysis_status', 'failed'),
        ]);

        const publicTotal = ((publicTotalRes as any).count || 0);
        const barcTotal = ((barcTotalRes as any).count || 0);
        const eurekaTotal = ((eurekaTotalRes as any).count || 0);
        const emailTotal = ((emailTotalRes as any).count || 0);

        const total = publicTotal + barcTotal + eurekaTotal + emailTotal;
        setTotalApplications(total || 0);

        const analyzed = ((barcCompletedRes as any).count || 0) + ((eurekaCompletedRes as any).count || 0) + ((emailCompletedRes as any).count || 0);
        const rejected = ((barcFailedRes as any).count || 0) + ((eurekaFailedRes as any).count || 0) + ((emailFailedRes as any).count || 0);
        const processing = (barcTotal - (((barcCompletedRes as any).count || 0) + ((barcFailedRes as any).count || 0)))
          + (eurekaTotal - (((eurekaCompletedRes as any).count || 0) + ((eurekaFailedRes as any).count || 0)))
          + (emailTotal - (((emailCompletedRes as any).count || 0) + ((emailFailedRes as any).count || 0)));

        setGlobalStatusCounts({ analyzed, rejected, processing });
      } catch (err) {
        console.error('Error fetching total/status counts:', err);
      }

      let allSubmissions: CombinedSubmission[] = [];


      // Helper function to add status filter
      const addStatusFilter = (query: any, tableName: string) => {
        if (filter === 'all') return query;
        
        if (tableName === 'public_form_submissions') {
          // Public form submissions don't have analysis_status
          return query;
        }
        
        if (filter === 'completed') return query.eq('analysis_status', 'completed');
        if (filter === 'failed') return query.eq('analysis_status', 'failed'); 
        if (filter === 'pending') return query.eq('analysis_status', 'pending');
        if (filter === 'processing') return query.or('analysis_status.eq.processing,analysis_status.is.null');
        
        return query;
      };

      // Helper function to fetch data efficiently with pagination and filtering
      const fetchWithPagination = async (tableName: string, baseQuery: any) => {
        try {
          const filteredQuery = addStatusFilter(baseQuery, tableName);
          const offset = (page - 1) * pageSize;
          const { data, error, count } = await filteredQuery
            .range(offset, offset + pageSize - 1)
            .select('*', { count: 'exact' });
          
          if (error) {
            console.error(`Error fetching from ${tableName}:`, error);
            return { data: [], count: 0 };
          }
          
          console.log(`${tableName} fetched:`, data?.length || 0, 'total:', count);
          return { data: data || [], count: count || 0 };
        } catch (error) {
          console.error(`Exception fetching from ${tableName}:`, error);
          return { data: [], count: 0 };
        }
      };

      let totalCount = 0;

      // Fetch public form submissions for user's forms
      if (userFormSlugs.length > 0) {
        console.log('Fetching public form submissions for user\'s forms...');
        const baseQuery = supabase
          .from('public_form_submissions')
          .select('*')
          .in('form_slug', userFormSlugs)
          .order('created_at', { ascending: false });

        const { data: publicSubmissions, count: publicCount } = await fetchWithPagination('public_form_submissions', baseQuery);
        totalCount += publicCount;
        
        const mappedPublicSubmissions: CombinedSubmission[] = (publicSubmissions || []).map(sub => ({
          id: sub.id,
          company_name: sub.title || 'Untitled Submission',
          submitter_email: sub.submitter_email || sub.founder_email || 'No email',
          created_at: sub.created_at,
          source: 'public_form' as const,
          form_slug: sub.form_slug,
          user_id: undefined,
          company_id: undefined,
          title: sub.title || 'Untitled Submission',
          description: sub.description,
          company_stage: sub.company_stage,
          industry: sub.industry,
          founder_name: sub.founder_name,
          founder_email: sub.founder_email,
          website_url: sub.website_url
        }));
        allSubmissions = [...allSubmissions, ...mappedPublicSubmissions];
      }

      // Fetch BARC form submissions - both for user's forms AND for current user
      console.log('Fetching BARC form submissions...');
      const barcBaseQuery = supabase
        .from('barc_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filter for user's forms OR user_id matches current user
      if (userFormSlugs.length > 0) {
        barcBaseQuery.or(`form_slug.in.(${userFormSlugs.join(',')}),user_id.eq.${user.id}`);
      } else {
        barcBaseQuery.eq('user_id', user.id);
      }

      const { data: barcSubmissions, count: barcCount } = await fetchWithPagination('barc_form_submissions', barcBaseQuery);
      totalCount += barcCount;
      
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
        company_id: sub.company_id,
        company_type: sub.company_type,
        company_registration_type: sub.company_registration_type,
        executive_summary: sub.executive_summary,
        question_1: sub.question_1,
        question_2: sub.question_2,
        question_3: sub.question_3,
        question_4: sub.question_4,
        question_5: sub.question_5,
        poc_name: sub.poc_name,
        phoneno: sub.phoneno,
        company_linkedin_url: sub.company_linkedin_url,
        founder_linkedin_urls: sub.founder_linkedin_urls,
        report_id: sub.report_id
      }));
      allSubmissions = [...allSubmissions, ...mappedBarcSubmissions];

      // Fetch Eureka form submissions - both for user's forms AND for current user
      console.log('Fetching Eureka form submissions...');
      const eurekaBaseQuery = supabase
        .from('eureka_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filter for user's forms OR user_id matches current user
      if (userFormSlugs.length > 0) {
        eurekaBaseQuery.or(`form_slug.in.(${userFormSlugs.join(',')}),user_id.eq.${user.id}`);
      } else {
        eurekaBaseQuery.eq('user_id', user.id);
      }

      const { data: eurekaSubmissions, count: eurekaCount } = await fetchWithPagination('eureka_form_submissions', eurekaBaseQuery);
      totalCount += eurekaCount;
      
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
        company_id: sub.company_id,
        company_type: sub.company_type,
        company_registration_type: sub.company_registration_type,
        executive_summary: sub.executive_summary,
        question_1: sub.question_1,
        question_2: sub.question_2,
        question_3: sub.question_3,
        question_4: sub.question_4,
        question_5: sub.question_5,
        poc_name: sub.poc_name,
        phoneno: sub.phoneno,
        company_linkedin_url: sub.company_linkedin_url,
        founder_linkedin_urls: sub.founder_linkedin_urls,
        report_id: sub.report_id
      }));
      allSubmissions = [...allSubmissions, ...mappedEurekaSubmissions];

      // Fetch email submissions
      console.log('Fetching email submissions...');
      const emailBaseQuery = supabase
        .from('email_pitch_submissions')
        .select('*')
        .eq('sender_email', user.email)
        .order('created_at', { ascending: false });

      const { data: emailSubmissions, count: emailCount } = await fetchWithPagination('email_pitch_submissions', emailBaseQuery);
      totalCount += emailCount;
      
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

      // Sort all submissions by created_at (most recent first) and remove duplicates
      const uniqueSubmissions = allSubmissions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .filter((submission, index, self) => 
          index === self.findIndex(s => s.id === submission.id)
        );

      console.log('Final submissions count after deduplication:', uniqueSubmissions.length);
      console.log('Total count from backend:', totalCount);
      
      setSubmissions(uniqueSubmissions);
      setTotalPages(Math.ceil(totalCount / pageSize));
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
    await fetchSubmissions(currentPage, statusFilter);
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    setIsLoading(true);
    await fetchSubmissions(page, statusFilter);
    setIsLoading(false);
  };

  const handleFilterChange = async (newFilter: 'all' | 'completed' | 'failed' | 'pending' | 'processing') => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
    setIsLoading(true);
    await fetchSubmissions(1, newFilter);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchSubmissions(1, 'all');
    }
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
          fetchSubmissions(currentPage, statusFilter);
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
          fetchSubmissions(currentPage, statusFilter);
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
          fetchSubmissions(currentPage, statusFilter);
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
          fetchSubmissions(currentPage, statusFilter);
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

  // Calculate status counts for IIT Bombay users
  const getStatusCounts = () => {
    if (!isIITBombay) return null;
    // Prefer aggregated counts if available
    if (globalStatusCounts) return globalStatusCounts;
    // Fallback to counts from loaded page data
    const analyzed = submissions.filter(s => s.analysis_status === 'completed').length;
    const rejected = submissions.filter(s => s.analysis_status === 'failed').length;
    const processing = submissions.filter(s => !s.analysis_status || s.analysis_status === 'pending' || s.analysis_status === 'processing').length;
    return { analyzed, rejected, processing };
  };

  const statusCounts = getStatusCounts();

  // No need to filter on frontend since filtering is done on backend now

  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case 'all': return 'All Status';
      case 'completed': return 'Analyzed';
      case 'failed': return 'Rejected';
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      default: return 'All Status';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">New Applications ({totalApplications ?? submissions.length})</h2>
          {isIITBombay && statusCounts && (
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-green-600 font-medium">
                Analyzed: {statusCounts.analyzed}
              </span>
              <span className="text-red-600 font-medium">
                Rejected: {statusCounts.rejected}
              </span>
            </div>
          )}
          <p className="text-muted-foreground">
            Recent submissions across all your forms and channels
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {getFilterLabel(statusFilter)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-background border shadow-lg">
              {['all', 'completed', 'failed', 'pending', 'processing'].map((status) => (
                <DropdownMenuItem 
                  key={status}
                  onClick={() => handleFilterChange(status as any)}
                  className="flex items-center justify-between cursor-pointer hover:bg-accent"
                >
                  <span>{getFilterLabel(status)}</span>
                  {statusFilter === status && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No submissions match your filter</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your filter or check back later for new applications
          </p>
        </div>
      ) : (
        <>
          {isIITBombay ? (
            <IITBombaySubmissionsTable submissions={submissions} />
          ) : (
            <PublicSubmissionsTable submissions={submissions} />
          )}
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      disabled={currentPage === 1}
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={currentPage === pageNum}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      disabled={currentPage === totalPages}
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
