
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle, BookText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { InvestorResearch } from "@/components/companies/InvestorResearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const handleOpenResearchModal = () => {
    setIsResearchModalOpen(true);
  };
  
  const handleOpenInvestorResearchModal = () => {
    if (!company) return;
    
    setIsInvestorResearchModalOpen(true);
  };
  
  return (
          <div className="flex gap-2">
            {!isLoading && company && userId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInvestorResearchModal}
                className="flex items-center gap-2 text-[#1EAEDB] hover:bg-[#1EAEDB]/10 border-[#1EAEDB]"
              >
                <BookText className="h-4 w-4" />
                Investor Research
              </Button>
            )}
            
            {!isLoading && company && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenResearchModal}
                className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              >
                <Sparkle className="mr-2 h-4 w-4" />
                Analyze in Real Time
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <CompanyDetails />
      
      {/* Market Research Modal */}
      <Dialog open={isResearchModalOpen} onOpenChange={setIsResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-amber-500" />
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
              <BookText className="h-5 w-5 text-[#1EAEDB]" />
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
