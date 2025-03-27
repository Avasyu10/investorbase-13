
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FundThesisAlignmentProps {
  companyId: string;
  companyName?: string;
}

export function FundThesisAlignment({ companyId, companyName = "This company" }: FundThesisAlignmentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [assessmentPoints, setAssessmentPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        
        console.log("Response from analyze-fund-thesis-alignment:", data);
        
        if (data.error) {
          console.error("API error:", data.error);
          toast.error(data.error);
          setError(`API error: ${data.error}`);
          setIsLoading(false);
          return;
        }
        
        // Process the analysis text into points for display
        if (data.analysis) {
          setAnalysis(data.analysis);
          
          // Parse the analysis to properly separate sections
          const sections: Record<string, string[]> = {
            summary: [],
            similarities: [],
            differences: []
          };
          
          let currentSection = 'summary';
          const lines = data.analysis.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            // Check for section headings with various possible formats
            if (line.match(/^\d+\.\s*Overall\s*Summary/i) || 
                line.match(/^\d+\.\s*Summary/i) || 
                line.includes('Summary') || 
                line.includes('summary')) {
              currentSection = 'summary';
              console.log("Found summary section:", line);
              continue;
            } else if (line.match(/^\d+\.\s*Key\s*Similarities/i) || 
                      line.match(/^\d+\.\s*Similarities/i) || 
                      line.includes('Similarities') || 
                      line.includes('similarities')) {
              currentSection = 'similarities';
              console.log("Found similarities section:", line);
              continue;
            } else if (line.match(/^\d+\.\s*Key\s*Differences/i) || 
                      line.match(/^\d+\.\s*Differences/i) || 
                      line.includes('Differences') || 
                      line.includes('differences')) {
              currentSection = 'differences';
              console.log("Found differences section:", line);
              continue;
            }
            
            // Skip numbered list markers and empty lines
            if (line.match(/^\d+\.$/) || line.trim() === '') {
              continue;
            }
            
            // Skip lines that only have a number (like "1.")
            if (line.match(/^\d+\.\s*$/)) {
              continue;
            }
            
            // Process content lines
            // Remove numbering from the beginning of points if present
            const cleanedLine = line.replace(/^(\d+\.\s*)/, '').trim();
            if (cleanedLine) {
              sections[currentSection].push(cleanedLine);
              console.log(`Added to ${currentSection}:`, cleanedLine);
            }
          }
          
          // If no sections were found, treat the entire text as one section
          if (sections.summary.length === 0 && 
              sections.similarities.length === 0 && 
              sections.differences.length === 0) {
            console.log("No sections found, treating entire text as one section");
            
            // Split by paragraphs or lines
            const paragraphs = data.analysis.split('\n\n')
              .filter(p => p.trim() !== '')
              .map(p => p.trim());
            
            if (paragraphs.length > 0) {
              sections.summary = paragraphs;
            } else {
              // Last resort: just use the whole text as one point
              sections.summary = [data.analysis.trim()];
            }
          }
          
          // Combine all points for display
          const allPoints = [
            ...sections.summary,
            ...sections.similarities,
            ...sections.differences
          ];
          
          const filteredPoints = allPoints
            .filter(p => p.trim() !== '')
            .map(p => p.replace(/^(-\s*)/, '').trim()); // Remove leading dashes if present
          
          console.log("Final assessment points:", filteredPoints);
          setAssessmentPoints(filteredPoints);
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
            {error ? (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
                <p className="text-sm text-red-500 mt-2">
                  Please make sure you have uploaded a fund thesis document in your profile.
                </p>
              </div>
            ) : analysis ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Analysis of how well {companyName} aligns with your investment thesis and strategic focus areas.
                </p>
                
                <div className="space-y-4 mt-4">
                  {assessmentPoints.length > 0 ? (
                    assessmentPoints.map((point, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50/50"
                      >
                        <Lightbulb className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" />
                        <span className="text-sm leading-relaxed">{point}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
                      <p className="text-sm text-amber-700">
                        Analysis completed but no specific points were extracted. This could be due to formatting issues.
                      </p>
                    </div>
                  )}
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
