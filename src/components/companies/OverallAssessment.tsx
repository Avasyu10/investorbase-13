
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Lightbulb, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnalysisModal } from '@/components/submissions/AnalysisModal';

interface OverallAssessmentProps {
  score: number;
  maxScore?: number;
  assessmentPoints?: string[];
  companyId?: string;
  companyName?: string;
}

export function OverallAssessment({ 
  score, 
  maxScore = 5,
  assessmentPoints = [
    "The global remote patient monitoring market is projected to reach $175.2 billion by 2030, growing at a CAGR of 17.1%, presenting a significant opportunity for PulseGuard.",
    "PulseGuard's 30% reduction in hospital readmissions from pilot programs is a strong proof point, but more data is needed to validate the results.",
    "The company's business model is based on subscription-based revenue, data analytics services, and value-added partnerships, providing multiple revenue streams.",
    "The team has a strong combination of clinical, technical, and operational expertise, increasing the likelihood of success.",
    "PulseGuard is seeking $2.5M in seed capital to accelerate product development, expand go-to-market initiatives, and ensure regulatory compliance, a reasonable ask for a seed-stage company."
  ],
  companyId,
  companyName
}: OverallAssessmentProps) {
  // Calculate progress percentage
  const progressPercentage = (score / maxScore) * 100;
  
  // Format score to one decimal place
  const formattedScore = typeof score === 'number' ? score.toFixed(1) : '0.0';
  
  // State for the Fund Thesis Alignment modal
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleFundThesisAlignment = async () => {
    if (!companyId) {
      toast.error("Company ID is required for thesis alignment");
      return;
    }
    
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
      
      const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: { 
          company_id: companyId,
          user_id: user.id
        }
      });
      
      if (error) {
        console.error("Error invoking analyze-fund-thesis-alignment:", error);
        toast.error("Failed to analyze fund thesis alignment");
        setError(`API error: ${error.message}`);
        setIsLoading(false);
        return;
      }
      
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

  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-emerald-400">{formattedScore}</span>
              <span className="text-sm text-muted-foreground">/{maxScore}</span>
            </div>
            
            {companyId && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50"
                onClick={handleFundThesisAlignment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-1" />
                )}
                Fund Thesis Alignment
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        <div className="mb-6">
          <Progress 
            value={progressPercentage} 
            className="h-2" 
          />
        </div>
        
        <div className="space-y-4">
          {assessmentPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg border-0"
            >
              <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500 shrink-0" />
              <span className="text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            variant="link" 
            className="text-amber-500 hover:text-amber-400 flex items-center gap-1 px-0"
          >
            View Full Analysis <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
      
      {/* Analysis Modal */}
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        isAnalyzing={isAnalyzing}
        submission={{ 
          id: companyId || '',
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
    </Card>
  );
}
