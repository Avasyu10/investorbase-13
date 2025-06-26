
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';

interface FundThesisAlignmentProps {
  companyId: string;
  companyName?: string;
}

export function FundThesisAlignment({ companyId, companyName = "This company" }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFundThesis, setHasFundThesis] = useState(false);

  const analyzeThesisAlignment = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (forceRefresh) {
        setAnalysis(null);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to analyze thesis alignment");
        setIsLoading(false);
        setError("Authentication required");
        return;
      }
      
      console.log("Analyzing fund thesis alignment for company:", companyId);
      console.log("User ID:", user.id);
      
      const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: { 
          company_id: companyId,
          user_id: user.id,
          force_refresh: forceRefresh
        }
      });
      
      if (error) {
        console.error("Error invoking analyze-fund-thesis-alignment:", error);
        toast.error("Failed to analyze fund thesis alignment");
        setError(`API error: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
      console.log("Response from analyze-fund-thesis-alignment:", data);
      
      if (data.error) {
        console.error("API error:", data.error);
        toast.error(data.error);
        setError(`API error: ${data.error}`);
        setIsLoading(false);
        return;
      }
      
      // Process the analysis text
      if (data.analysis) {
        setAnalysis(data.analysis);
        // Automatically open the analysis modal once the data is loaded
        setIsAnalysisModalOpen(true);
        toast.success("Fund thesis analysis completed!");
      } else {
        setError("No analysis data received from API");
      }
    } catch (error) {
      console.error("Error in thesis alignment analysis:", error);
      toast.error("Failed to analyze fund thesis alignment");
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if user has a fund thesis on component mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Check if user has a fund thesis by looking for a non-null thesis URL
          const { data, error } = await supabase
            .from('vc_profiles')
            .select('fund_thesis_url')
            .eq('id', user.id)
            .single();
            
          if (!error && data && data.fund_thesis_url) {
            setHasFundThesis(true);
          } else {
            // If first query fails, the profile might be using a different ID structure
            // Try to get the profile directly without filtering
            console.log("Trying alternative method to find fund thesis...");
            const { data: profileData, error: profileError } = await supabase
              .from('vc_profiles')
              .select('fund_thesis_url')
              .single();
              
            if (!profileError && profileData && profileData.fund_thesis_url) {
              setHasFundThesis(true);
              console.log("Found fund thesis with alternative method");
            } else {
              console.log("No fund thesis found:", profileError);
              setHasFundThesis(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking fund thesis:', error);
      }
    };
    
    checkUser();
  }, []);

  const handleAnalyzeClick = () => {
    if (!hasFundThesis) {
      toast.error("Please upload a fund thesis document in your profile first");
      return;
    }
    analyzeThesisAlignment(false);
  };

  const handleRefreshAnalysis = () => {
    analyzeThesisAlignment(true);
  };

  return (
    <>
      <Button
        onClick={handleAnalyzeClick}
        disabled={isLoading || !hasFundThesis}
        variant="outline"
        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Fund Thesis Analysis
          </>
        )}
      </Button>

      {error && (
        <div className="mt-2 p-3 border border-red-200 bg-red-50 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-1">
                Please make sure you have uploaded a fund thesis document in your profile.
              </p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-blue-600" />
              Fund Thesis Alignment Analysis
              <span className="text-sm font-normal text-muted-foreground">
                - {companyName}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[75vh] pr-4">
            <div className="space-y-6 py-4">
              {analysis ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      // Enhanced paragraph styling with proper spacing
                      p: ({ children }) => (
                        <p className="mb-4 leading-relaxed text-sm text-foreground">{children}</p>
                      ),
                      // Enhanced bullet points with better spacing and indentation
                      ul: ({ children }) => (
                        <ul className="mb-6 space-y-2 pl-6 list-disc">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm leading-relaxed text-foreground pl-1">{children}</li>
                      ),
                      // Enhanced numbered lists
                      ol: ({ children }) => (
                        <ol className="mb-6 space-y-2 pl-6 list-decimal">{children}</ol>
                      ),
                      // Enhanced headers with better spacing and colors
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-foreground border-b pb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-foreground">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-foreground">{children}</h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-medium mb-2 mt-3 first:mt-0 text-foreground">{children}</h4>
                      ),
                      // Enhanced strong text
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      // Enhanced emphasis
                      em: ({ children }) => (
                        <em className="italic text-muted-foreground">{children}</em>
                      ),
                      // Enhanced code blocks
                      code: ({ children }) => (
                        <code className="bg-secondary px-2 py-1 rounded text-xs font-mono text-foreground">{children}</code>
                      ),
                      // Enhanced blockquotes
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 ml-2 italic text-muted-foreground my-4 bg-secondary/20 py-2">
                          {children}
                        </blockquote>
                      ),
                      // Enhanced tables
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border border-border">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border px-3 py-2 bg-secondary text-left font-medium text-sm">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-3 py-2 text-sm">{children}</td>
                      ),
                    }}
                  >
                    {analysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No analysis available</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="border-t pt-4 flex justify-between items-center">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleRefreshAnalysis}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Analysis
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => setIsAnalysisModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
