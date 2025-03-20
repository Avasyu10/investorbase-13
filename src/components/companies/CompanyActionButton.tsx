
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { analyzeReport } from "@/lib/supabase";

interface CompanyActionButtonProps {
  companyId: string;
  reportId: string | null;
  status?: string;
}

export function CompanyActionButton({ companyId, reportId, status }: CompanyActionButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!reportId) {
      toast.error("No report associated with this company");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeReport(reportId);
      
      toast.success("Analysis complete", {
        description: "The pitch deck has been successfully analyzed"
      });
      
      // Navigate to the company page
      navigate(`/company/${companyId}`);
    } catch (error) {
      console.error("Error analyzing report:", error);
      toast.error("Analysis failed", {
        description: error instanceof Error ? error.message : "Failed to analyze pitch deck"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // If the report is from a public submission and hasn't been analyzed yet
  const isPublicSubmission = reportId && status === 'pending';
  
  if (isPublicSubmission) {
    return (
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        size="sm"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          "Analyze"
        )}
      </Button>
    );
  }

  // Default view button for analyzed companies
  return (
    <Button
      onClick={() => navigate(`/company/${companyId}`)}
      size="sm"
      variant="outline"
    >
      View
    </Button>
  );
}
