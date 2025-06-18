
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisModal } from '@/components/submissions/AnalysisModal';
import type { CombinedSubmission } from '@/components/submissions/types';

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
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFundThesis, setHasFundThesis] = useState(false);

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
  
  // Check if user has a fund thesis
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
  
  useEffect(() => {
    analyzeThesisAlignment();
  }, [companyId]);

  const handleRefreshAnalysis = () => {
    analyzeThesisAlignment(true);
  };

  // If there's an error loading, show an error message
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
                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50"
                onClick={handleRefreshAnalysis}
                disabled={refreshing}
              >
                <span>Refresh Analysis</span>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create a mock submission that matches CombinedSubmission type
  const mockSubmission: CombinedSubmission = {
    id: companyId,
    company_name: companyName,
    submitter_email: '',
    created_at: new Date().toISOString(),
    source: 'public_form' as const,
    analysis_result: analysis,
    title: `${companyName} Fund Thesis Analysis`,
    description: 'Fund thesis alignment analysis'
  };

  return (
    <>
      <div className="flex gap-4">
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

      <AnalysisModal
        open={isAnalysisModalOpen}
        onOpenChange={setIsAnalysisModalOpen}
        submission={mockSubmission}
      />
    </>
  );
}
