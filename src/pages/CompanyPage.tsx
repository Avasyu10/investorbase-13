
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const { company, isLoading } = useCompanyDetails(id);
  const [hasFundThesis, setHasFundThesis] = useState(false);
  
  // Check if user has a fund thesis document
  useEffect(() => {
    const checkFundThesis = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
      
      {/* Conditionally render FundThesisAlignment if the user has a fund thesis */}
      {!isLoading && company && hasFundThesis && (
        <div className="container mx-auto px-4 py-4">
          <FundThesisAlignment 
            companyId={company.id.toString()} 
            companyName={company.name}
          />
        </div>
      )}
      
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
    </div>
  );
};

export default CompanyPage;
