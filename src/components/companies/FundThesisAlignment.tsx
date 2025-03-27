
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface FundThesisAlignmentProps {
  companyId: string;
}

interface FundThesisAnalysis {
  id: string;
  company_id: string;
  user_id: string;
  thesis_document_id: string;
  alignment_score: number;
  alignment_reasons: string[];
  fund_perspective_strengths: string[];
  fund_perspective_concerns: string[];
  recommendation: string;
  summary: string;
  created_at: string;
}

export const FundThesisAlignment = ({ companyId }: FundThesisAlignmentProps) => {
  const [analysis, setAnalysis] = useState<FundThesisAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('fund_thesis_analysis')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) throw error;
        
        setAnalysis(data);
      } catch (err) {
        console.error("Error fetching fund thesis analysis:", err);
        setError(err.message || "Failed to load analysis");
      } finally {
        setIsLoading(false);
      }
    };

    if (companyId) {
      fetchAnalysis();
    }
  }, [companyId]);

  const getRecommendationColor = (recommendation: string) => {
    switch(recommendation.toLowerCase()) {
      case 'strong yes':
        return 'text-green-600 font-bold';
      case 'yes':
        return 'text-green-500';
      case 'maybe':
        return 'text-yellow-500';
      case 'no':
        return 'text-red-500';
      case 'strong no':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-green-400';
    if (score >= 5) return 'bg-yellow-400';
    if (score >= 3) return 'bg-orange-400';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p className="font-semibold">Error loading analysis</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg">No fund thesis analysis available</p>
        <p className="text-muted-foreground mt-2">Try running the analysis again</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Alignment Score: {analysis.alignment_score}/10</h3>
          <p className="text-sm text-muted-foreground">How well this company aligns with your investment thesis</p>
        </div>
        <div className="text-right">
          <h3 className="text-lg font-semibold">Recommendation:</h3>
          <p className={`text-lg ${getRecommendationColor(analysis.recommendation)}`}>
            {analysis.recommendation}
          </p>
        </div>
      </div>
      
      <Progress 
        value={analysis.alignment_score * 10} 
        className={`h-2 ${getScoreColor(analysis.alignment_score)}`} 
      />
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Analysis Summary</h3>
        <p className="text-sm whitespace-pre-line">{analysis.summary}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-3">Alignment Reasons</h3>
            <ul className="list-disc pl-5 space-y-2">
              {analysis.alignment_reasons.map((reason, index) => (
                <li key={index} className="text-sm">{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-3">Fund Perspective</h3>
            
            <div className="mb-4">
              <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.fund_perspective_strengths.map((strength, index) => (
                  <li key={index} className="text-sm">{strength}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-red-600 mb-2">Concerns</h4>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.fund_perspective_concerns.map((concern, index) => (
                  <li key={index} className="text-sm">{concern}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-xs text-muted-foreground text-right mt-8">
        Analysis generated on {new Date(analysis.created_at).toLocaleString()}
      </div>
    </div>
  );
};
