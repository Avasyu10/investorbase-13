import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { PublicSubmissionsTable } from "@/components/submissions/PublicSubmissionsTable";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { CombinedSubmission } from "@/components/submissions/types";

export default function PublicFormApplications() {
  const [submissions, setSubmissions] = useState<CombinedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalApplications, setTotalApplications] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSubmissions = async (page: number = currentPage) => {
    if (!user) {
      console.log('No user found, skipping submissions fetch');
      setSubmissions([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching public form submissions for user:', user.id, 'page:', page);
      
      // Get user's owned form slugs
      const { data: userForms, error: formsError } = await supabase
        .from('public_submission_forms')
        .select('form_slug')
        .eq('user_id', user.id)
        .eq('form_type', 'general');

      if (formsError) {
        console.error('Error fetching user forms:', formsError);
        throw formsError;
      }

      const userFormSlugs = userForms?.map(form => form.form_slug) || [];

      if (userFormSlugs.length === 0) {
        setSubmissions([]);
        setTotalApplications(0);
        setTotalPages(0);
        return;
      }

      // Fetch public form submissions for user's forms
      const offset = (page - 1) * pageSize;
      const { data: publicSubmissions, error, count } = await supabase
        .from('public_form_submissions')
        .select('*', { count: 'exact' })
        .in('form_slug', userFormSlugs)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('Error fetching public form submissions:', error);
        throw error;
      }

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

      setSubmissions(mappedPublicSubmissions);
      setTotalApplications(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching public form submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch public form applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubmissions(currentPage);
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    setIsLoading(true);
    await fetchSubmissions(page);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchSubmissions(1);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const publicChannel = supabase
      .channel('public-submissions-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_form_submissions'
        },
        (payload) => {
          console.log('📡 Public form submission change:', payload);
      fetchSubmissions(currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(publicChannel);
    };
  }, [user, currentPage]);

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
          <h2 className="text-2xl font-bold">Public Form Applications ({totalApplications || 0})</h2>
          <p className="text-muted-foreground">
            General public form submissions to your forms
          </p>
        </div>
        <div className="flex gap-2">
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
          <h3 className="mt-4 text-lg font-medium">No public form applications found</h3>
          <p className="mt-2 text-muted-foreground">
            Check back later for new applications to your public forms
          </p>
        </div>
      ) : (
        <>
          <PublicSubmissionsTable submissions={submissions} />
          
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