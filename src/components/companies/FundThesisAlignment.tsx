
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisModal } from '@/components/submissions/AnalysisModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface FundThesisAlignmentProps {
  companyId: string;
  companyName?: string;
}

export function FundThesisAlignment({ companyId, companyName = "This company" }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFundThesisModalOpen, setIsFundThesisModalOpen] = useState(false);
  const [fundThesisUrl, setFundThesisUrl] = useState<string | null>(null);

  const analyzeThesisAlignment = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (forceRefresh) {
        setRefreshing(true);
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
        setRefreshing(false);
        return;
      }
      
      console.log("Response from analyze-fund-thesis-alignment:", data);
      
      if (data.error) {
        console.error("API error:", data.error);
        toast.error(data.error);
        setError(`API error: ${data.error}`);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Process the analysis text
      if (data.analysis) {
        setAnalysis(data.analysis);
        // Automatically open the analysis modal once the data is loaded
        setIsAnalysisModalOpen(true);
      } else {
        setError("No analysis data received from API");
      }
    } catch (error) {
      console.error("Error in thesis alignment analysis:", error);
      toast.error("Failed to analyze fund thesis alignment");
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    analyzeThesisAlignment();
  }, [companyId]);

  const handleRefreshAnalysis = () => {
    analyzeThesisAlignment(true);
  };

  const handleViewThesis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to view your fund thesis");
        return;
      }
      
      // Check if user has fund thesis directly in vc_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('vc_profiles')
        .select('fund_thesis_url')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profileData?.fund_thesis_url) {
        console.log("No fund thesis found in vc_profiles table, trying to get URL directly");
        
        // Get the URL of the fund thesis document using the Edge Function
        const { data, error } = await supabase.storage
          .from('vc_documents')
          .createSignedUrl(`${user.id}/fund_thesis.pdf`, 60);
        
        if (error || !data?.signedUrl) {
          console.error("Error getting fund thesis URL:", error);
          toast.error("Failed to retrieve fund thesis document");
          return;
        }
        
        // Set the fund thesis URL and open modal
        setFundThesisUrl(data.signedUrl);
        setIsFundThesisModalOpen(true);
      } else {
        // Set the fund thesis URL from profile and open modal
        setFundThesisUrl(profileData.fund_thesis_url);
        setIsFundThesisModalOpen(true);
      }
    } catch (error) {
      console.error("Error viewing fund thesis:", error);
      toast.error("Failed to retrieve fund thesis document");
    }
  };

  // If there's an error loading, show an error message with a button to view thesis
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm text-muted-foreground ml-3">Analyzing alignment with your fund thesis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-1">
              Please make sure you have uploaded a fund thesis document in your profile.
            </p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50"
                onClick={handleViewThesis}
              >
                <span>View Your Fund Thesis</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 mt-4"
          onClick={handleViewThesis}
        >
          <span>View Your Fund Thesis</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 mt-4"
          onClick={handleRefreshAnalysis}
          disabled={refreshing}
        >
          <span>Refresh Analysis</span>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Fund Thesis PDF Modal */}
      <Dialog open={isFundThesisModalOpen} onOpenChange={setIsFundThesisModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Your Fund Thesis</DialogTitle>
            <DialogDescription>
              Review your investment thesis document
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2 flex-grow overflow-hidden">
            {fundThesisUrl && (
              <iframe 
                src={`${fundThesisUrl}#toolbar=0`} 
                className="w-full h-[70vh] border-none"
                title="Fund Thesis PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        isAnalyzing={isAnalyzing}
        submission={{ 
          id: companyId,
          title: companyName || "Company Analysis",
          description: null,
          company_stage: null,
          industry: null,
          website_url: null,
          created_at: new Date().toISOString(),
          form_slug: "",
          pdf_url: null,
          report_id: null
        }}
        onClose={() => setIsAnalysisModalOpen(false)}
        analysisText={analysis}
      />
    </>
  );
}
