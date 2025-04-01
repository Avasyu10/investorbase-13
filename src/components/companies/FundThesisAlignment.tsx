
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AnalysisModal } from '@/components/submissions/AnalysisModal';

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

  useEffect(() => {
    async function analyzeThesisAlignment() {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("You need to be logged in to analyze thesis alignment");
          setIsLoading(false);
          setError("Authentication required");
          return;
        }
        
        console.log("Analyzing fund thesis alignment for company:", companyId);
        console.log("User ID:", user.id);
        
        // Make sure we're using the full function URL with proper CORS handling
        const { data, error: functionError } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
          body: { 
            company_id: companyId,
            user_id: user.id
          }
        });
        
        if (functionError) {
          console.error("Error invoking analyze-fund-thesis-alignment:", functionError);
          toast.error("Failed to analyze fund thesis alignment");
          setError(`API error: ${functionError.message}`);
          setIsLoading(false);
          return;
        }
        
        console.log("Response from analyze-fund-thesis-alignment:", data);
        
        if (data?.error) {
          console.error("API error:", data.error);
          toast.error(data.error);
          setError(`API error: ${data.error}`);
          setIsLoading(false);
          return;
        }
        
        // Process the analysis text
        if (data?.analysis) {
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
      }
    }
    
    analyzeThesisAlignment();
  }, [companyId]);

  const handleViewThesis = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to view your fund thesis");
        return;
      }
      
      // Get the URL of the fund thesis document
      const { data, error } = await supabase.functions.invoke('handle-vc-document-upload', {
        body: { 
          action: 'get_url', 
          userId: user.id,
          documentType: 'fund_thesis' 
        }
      });
      
      if (error || !data?.url) {
        console.error("Error getting fund thesis URL:", error);
        toast.error("Failed to retrieve fund thesis document");
        return;
      }
      
      // Open the fund thesis in a new tab
      window.open(data.url, '_blank');
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

  // The component now renders nothing visible initially, 
  // just the modal that will open automatically when analysis is loaded
  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 mt-4"
        onClick={handleViewThesis}
      >
        <span>View Your Fund Thesis</span>
        <ExternalLink className="h-4 w-4" />
      </Button>

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
