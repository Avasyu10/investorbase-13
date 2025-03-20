
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function PublicSubmissionsList() {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          setSubmissions([]);
          return;
        }
        
        console.log('Fetching public submissions');
        
        // Query for public submissions that have been analyzed
        // We're explicitly requiring is_public_submission = true
        const { data, error } = await supabase
          .from('reports')
          .select('*, companies!reports_company_id_fkey(*)')
          .eq('is_public_submission', true)
          .not('company_id', 'is', null)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching public submissions:', error);
          setError(error);
          toast({
            title: "Error loading submissions",
            description: error.message,
            variant: "destructive"
          });
          return;
        }
        
        console.log(`Found ${data?.length || 0} public submissions`);
        setSubmissions(data || []);
      } catch (err) {
        console.error('Error in fetchSubmissions:', err);
        setError(err);
        toast({
          title: "Error loading submissions",
          description: "Failed to load public submissions",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSubmissions();
  }, [toast]);

  const handleCompanyClick = (companyId) => {
    if (companyId) {
      navigate(`/company/${companyId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Submissions</h2>
          <p className="text-muted-foreground mb-4">There was a problem fetching public submissions.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and analyze pitch decks submitted by the community
          </p>
        </div>
      </div>
      
      {submissions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((submission) => (
            <Card 
              key={submission.id} 
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => handleCompanyClick(submission.company_id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl">{submission.title}</CardTitle>
                {submission.companies && (
                  <CardDescription>
                    Overall Score: {submission.companies.overall_score}/5
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {submission.companies && (
                  <Progress 
                    value={submission.companies.overall_score * 20} 
                    className="h-2 mb-2" 
                  />
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Added: {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium mb-2">No public submissions found</h3>
          <p className="text-muted-foreground mb-6">
            No public submissions are available at this time.
          </p>
        </div>
      )}
    </div>
  );
}
