
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FundThesisAlignmentProps {
  companyId: string;
  companyName: string;
}

export function FundThesisAlignment({ companyId, companyName }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [assessmentPoints, setAssessmentPoints] = useState<string[]>([]);

  useEffect(() => {
    async function analyzeThesisAlignment() {
      try {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("You need to be logged in to analyze thesis alignment");
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
          body: { 
            company_id: companyId,
            user_id: user.id
          }
        });
        
        if (error) {
          console.error("Error analyzing fund thesis alignment:", error);
          toast.error("Failed to analyze fund thesis alignment");
          setIsLoading(false);
          return;
        }
        
        if (data.error) {
          console.error("API error:", data.error);
          toast.error(data.error);
          setIsLoading(false);
          return;
        }
        
        // Process the analysis text into points for display
        if (data.analysis) {
          setAnalysis(data.analysis);
          
          // Convert the analysis text into points for display
          const lines = data.analysis.split('\n').filter(line => line.trim() !== '');
          const points = lines.filter(line => !line.match(/^\d+\./)); // Filter out section headings
          setAssessmentPoints(points);
        }
      } catch (error) {
        console.error("Error in thesis alignment analysis:", error);
        toast.error("Failed to analyze fund thesis alignment");
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
      
      // Redirect to handle-vc-document-upload to view the fund thesis
      const { data, error } = await supabase.functions.invoke('handle-vc-document-upload', {
        body: { 
          action: 'get_url', 
          userId: user.id,
          documentType: 'fund_thesis' 
        }
      });
      
      if (error || !data?.url) {
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

  return (
    <Card className="shadow-md border bg-card overflow-hidden mb-8">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-xl font-semibold">Fund Thesis Alignment</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 px-4 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing alignment with your fund thesis...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {analysis ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Analysis of how well {companyName} aligns with your investment thesis and strategic focus areas.
                </p>
                
                <div className="space-y-4 mt-4">
                  {assessmentPoints.map((point, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50/50"
                    >
                      <Lightbulb className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" />
                      <span className="text-sm leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Failed to analyze alignment with your fund thesis. Please make sure you have uploaded a fund thesis document.
              </p>
            )}
            
            <div className="pt-2">
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
        )}
      </CardContent>
    </Card>
  );
}
