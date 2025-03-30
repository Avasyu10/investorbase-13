
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { InvestorResearch } from "@/components/companies/InvestorResearch";
import { supabase } from "@/integrations/supabase/client";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isInvestorResearchModalOpen, setIsInvestorResearchModalOpen] = useState(false);
  const { company, isLoading } = useCompanyDetails(id);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    
    getUser();
  }, []);
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className="animate-fade-in">
      {/* Header section removed as requested */}
      
      <CompanyDetails />
      
      {/* Market Research Modal */}
      <Dialog open={isResearchModalOpen} onOpenChange={setIsResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="h-5 w-5 text-amber-500"></span>
              Real-Time Market Research
            </DialogTitle>
            <DialogDescription>
              Analyze market trends and competitive landscape for this company
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {company && (
              <MarketResearch 
                companyId={company.id.toString()} 
                assessmentPoints={company.assessmentPoints || []} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Investor Research Modal */}
      <Dialog open={isInvestorResearchModalOpen} onOpenChange={setIsInvestorResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="h-5 w-5 text-[#1EAEDB]"></span>
              Investor Research
            </DialogTitle>
            <DialogDescription>
              Comprehensive investor-focused research and analysis for this company
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {company && userId && (
              <InvestorResearch 
                companyId={company.id.toString()}
                assessmentPoints={company.assessmentPoints || []}
                userId={userId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPage;
