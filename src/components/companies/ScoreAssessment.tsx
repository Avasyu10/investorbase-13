
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { ArrowUpRight, Lightbulb, BarChart2, HelpCircle, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MarketResearch } from "./MarketResearch";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FundThesisAlignment } from "./FundThesisAlignment";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ScoreAssessmentProps {
  company: CompanyDetailed;
}

export function ScoreAssessment({ company }: ScoreAssessmentProps) {
  const [isFundThesisModalOpen, setIsFundThesisModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFundThesis, setHasFundThesis] = useState(false);
  
  // Format overall score to whole number
  const formattedScore = Math.round(company.overallScore);
  
  // Calculate progress percentage (already 0-100 scale)
  const progressPercentage = formattedScore;
  
  // Get score color class
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    if (score >= 30) return "text-orange-600";
    return "text-red-600";
  };
  
  // Get progress bar color class
  const getProgressColor = (score: number) => {
    if (score >= 90) return "score-excellent";
    if (score >= 70) return "score-good"; 
    if (score >= 50) return "score-average";
    if (score >= 30) return "score-poor";
    return "score-critical";
  };
  
  // Get score description
  const getScoreDescription = (score: number): string => {
    if (score >= 90) return `Outstanding Investment Opportunity (${score}/100): This company demonstrates exceptional market position, business model, and growth metrics. Clear competitive advantages with minimal risk factors. Recommended for immediate investment consideration.`;
    if (score >= 70) return `Strong Investment Candidate (${score}/100): This company shows solid fundamentals with some competitive advantages, though minor concerns exist. Good potential for returns with manageable risk profile. Worth serious investment consideration.`;
    if (score >= 50) return `Moderate Investment Potential (${score}/100): This company has sound basic operations but several areas need improvement. Moderate risk factors exist that could impact growth. Requires careful due diligence before investment.`;
    if (score >= 30) return `High-Risk Investment (${score}/100): Significant flaws in business model, market approach, or financials create substantial concerns. Many improvements needed before being investment-ready. Consider only with extensive restructuring.`;
    return `Not Recommended (${score}/100): This company shows critical deficiencies across multiple dimensions, presenting unacceptable investment risk. Fundamental business model or execution issues require complete overhaul.`;
  };

  // Highlight numbers in assessment points
  const highlightNumbers = (text: string) => {
    return text.replace(/(\d+(?:\.\d+)?%?|\$\d+(?:\.\d+)?[KMBTkmbt]?|\d+(?:\.\d+)?[KMBTkmbt])/g, 
      (match) => `<span class="font-medium text-primary">${match}</span>`);
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
  
  const handleOpenFundThesisModal = () => {
    if (!company || !userId) return;
    setIsFundThesisModalOpen(true);
  };

  return (
    <>
      <Card className="mb-8 shadow-card border-0">
        <CardHeader className="bg-secondary/50 border-b pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Overall Assessment
            </CardTitle>
            <div className="flex items-center">
              <span className={`text-xl font-bold ${getScoreColor(formattedScore)}`}>
                {formattedScore}/100
              </span>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="max-w-[320px] text-xs">
                    <p>{getScoreDescription(formattedScore)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {hasFundThesis && userId && (
                <Button 
                  variant="outline"
                  className="ml-4 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  onClick={handleOpenFundThesisModal}
                >
                  <Lightbulb className="mr-2 h-4 w-4 text-white" />
                  Fund Thesis Alignment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {company.assessmentPoints && company.assessmentPoints.length > 0 ? (
            <div className="space-y-3">
              {company.assessmentPoints.map((point, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p 
                    className="text-sm text-muted-foreground" 
                    dangerouslySetInnerHTML={{ __html: highlightNumbers(point) }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 items-start">
              <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                No assessment points available. The AI analysis typically provides a comprehensive overview 
                of the company's strengths and areas for improvement, including quantitative metrics to help 
                you make informed investment decisions.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <Link 
            to={`/company/${company.id.toString()}/analysis`}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1 transition-colors"
          >
            View Full Analysis <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardFooter>
      </Card>
      
      {/* Fund Thesis Alignment Modal */}
      <Dialog open={isFundThesisModalOpen} onOpenChange={setIsFundThesisModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              Fund Thesis Alignment
            </DialogTitle>
            <DialogDescription>
              Analysis of how well this company aligns with your investment thesis
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {company && userId && (
              <FundThesisAlignment 
                companyId={company.id.toString()}
                companyName={company.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Market Research component */}
      <MarketResearch 
        companyId={company.id.toString()} 
        assessmentPoints={company.assessmentPoints || []} 
      />
    </>
  );
}
