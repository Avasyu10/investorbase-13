
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle, Lightbulb, BookText, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";
import { InvestorResearch } from "@/components/companies/InvestorResearch";
import { CompanyChatbot } from "@/components/companies/CompanyChatbot";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isFundThesisModalOpen, setIsFundThesisModalOpen] = useState(false);
  const [isInvestorResearchModalOpen, setIsInvestorResearchModalOpen] = useState(false);
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);
  const { company, isLoading } = useCompanyDetails(id);
  const [hasFundThesis, setHasFundThesis] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Check if user has a fund thesis document and get user ID
  useEffect(() => {
    const checkFundThesis = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          const { count, error } = await supabase
            .from('fund_thesis_analysis')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (error) {
            console.error('Error checking fund thesis:', error);
            return;
          }
          
          setHasFundThesis(count !== null && count > 0);
        }
      } catch (error) {
        console.error('Error checking fund thesis:', error);
      }
    };
    
    checkFundThesis();
  }, []);
  
  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenResearchModal = () => {
    setIsResearchModalOpen(true);
  };
  
  const handleOpenFundThesisModal = () => {
    if (!company) return;
    
    setIsFundThesisModalOpen(true);
  };
  
  const handleOpenInvestorResearchModal = () => {
    if (!company) return;
    
    setIsInvestorResearchModalOpen(true);
  };
  
  const handleOpenChatbotModal = () => {
    if (!company) return;
    
    setIsChatbotModalOpen(true);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
          
          <div className="flex gap-2">
            {!isLoading && company && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChatbotModal}
                className="flex items-center gap-2 text-purple-500 hover:bg-purple-500/10 border-purple-500"
              >
                <MessageCircle className="h-4 w-4" />
                AI Assistant
              </Button>
            )}
          
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
            
            {!isLoading && company && hasFundThesis && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenFundThesisModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                <Lightbulb className="mr-2 h-4 w-4 text-white" />
                Fund Thesis Alignment
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
            {company && (
              <FundThesisAlignment 
                companyId={company.id.toString()}
                companyName={company.name}
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
      
      {/* AI Assistant Modal */}
      <Dialog open={isChatbotModalOpen} onOpenChange={setIsChatbotModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              AI Company Assistant
            </DialogTitle>
            <DialogDescription>
              Chat with an AI assistant to learn more about this company
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 flex-1 overflow-hidden">
            {company && (
              <CompanyChatbot 
                companyId={company.id.toString()}
                companyName={company.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPage;
