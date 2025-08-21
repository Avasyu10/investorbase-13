import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { IITBombaySubmissionsTable } from "@/components/submissions/IITBombaySubmissionsTable";
import { PublicSubmissionsTable } from "@/components/submissions/PublicSubmissionsTable";
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
import type { CombinedSubmission } from "@/components/submissions/types";

export default function EurekaApplications() {
  const [submissions, setSubmissions] = useState<CombinedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalApplications, setTotalApplications] = useState<number | null>(null);
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
      console.log('Fetching Eureka submissions for user:', user.id, 'page:', page, 'filter:', filter);
      
      // Get user's owned form slugs
      const { data: userForms, error: formsError } = await supabase
        .from('public_submission_forms')
        .select('form_slug')
        .eq('user_id', user.id)
        .eq('form_type', 'eureka');

      if (formsError) {
        console.error('Error fetching user forms:', formsError);
        throw formsError;
      }

      const userFormSlugs = userForms?.map(form => form.form_slug) || [];

      // Helper function to add status filter
      const addStatusFilter = (query: any) => {
        if (filter === 'all') return query;
        if (filter === 'completed') return query.eq('analysis_status', 'completed');
        if (filter === 'failed') return query.eq('analysis_status', 'failed'); 
        if (filter === 'pending') return query.eq('analysis_status', 'pending');
        if (filter === 'processing') return query.or('analysis_status.eq.processing,analysis_status.is.null');
        return query;
      };

      // Fetch Eureka form submissions
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

      const filteredQuery = addStatusFilter(eurekaBaseQuery);
      const offset = (page - 1) * pageSize;
      const { data: eurekaSubmissions, error, count } = await filteredQuery
        .range(offset, offset + pageSize - 1)
        .select('*', { count: 'exact' });
      
      if (error) {
        console.error('Error fetching Eureka submissions:', error);
        throw error;
      }

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

      setSubmissions(mappedEurekaSubmissions);
      setTotalApplications(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching Eureka submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Eureka applications. Please try again.",
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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const eurekaChannel = supabase
      .channel('eureka-submissions-page-realtime')
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

    return () => {
      supabase.removeChannel(eurekaChannel);
    };
  }, [user, currentPage, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold">Eureka Applications ({totalApplications || 0})</h2>
          <p className="text-muted-foreground">
            Eureka form submissions across all your forms
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
          <h3 className="mt-4 text-lg font-medium">No Eureka applications found</h3>
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