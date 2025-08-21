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

export default function EmailApplications() {
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
      console.log('Fetching email submissions for user:', user.email, 'page:', page, 'filter:', filter);

      // Helper function to add status filter
      const addStatusFilter = (query: any) => {
        if (filter === 'all') return query;
        if (filter === 'completed') return query.eq('analysis_status', 'completed');
        if (filter === 'failed') return query.eq('analysis_status', 'failed'); 
        if (filter === 'pending') return query.eq('analysis_status', 'pending');
        if (filter === 'processing') return query.or('analysis_status.eq.processing,analysis_status.is.null');
        return query;
      };

      // Fetch email pitch submissions
      const emailBaseQuery = supabase
        .from('email_pitch_submissions')
        .select('*')
        .eq('sender_email', user.email)
        .order('created_at', { ascending: false });

      const filteredQuery = addStatusFilter(emailBaseQuery);
      const offset = (page - 1) * pageSize;
      const { data: emailSubmissions, error, count } = await filteredQuery
        .range(offset, offset + pageSize - 1)
        .select('*', { count: 'exact' });
      
      if (error) {
        console.error('Error fetching email submissions:', error);
        throw error;
      }

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

      setSubmissions(mappedEmailSubmissions);
      setTotalApplications(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching email submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email applications. Please try again.",
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

    const emailChannel = supabase
      .channel('email-submissions-page-realtime')
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

    return () => {
      supabase.removeChannel(emailChannel);
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
          <h2 className="text-2xl font-bold">Email Applications ({totalApplications || 0})</h2>
          <p className="text-muted-foreground">
            Email pitch submissions sent to your email
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
          <h3 className="mt-4 text-lg font-medium">No email applications found</h3>
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