
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isFundThesisModalOpen, setIsFundThesisModalOpen] = useState(false);
  const [hasFundThesis, setHasFundThesis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { company, isLoading: companyLoading } = useCompanyDetails(id);
  
  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenResearchModal = () => {
    setIsResearchModalOpen(true);
  };

  const handleOpenFundThesisModal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-fund-thesis-alignment', {
        body: { companyId: id },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setIsFundThesisModalOpen(true);
    } catch (error) {
      console.error("Error analyzing fund thesis alignment:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze fund thesis alignment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the user has a fund thesis document
  useEffect(() => {
    const checkFundThesis = async () => {
      // Use a more specific query to avoid type errors
      const { data, error } = await supabase
        .from('vc_documents')
        .select('id')
        .eq('document_type', 'fund_thesis')
        .limit(1);
      
      console.log("Fund thesis documents:", data);
      
      if (!error && data && data.length > 0) {
        setHasFundThesis(true);
      } else if (error) {
        console.error("Error checking fund thesis:", error);
      }
    };

    checkFundThesis();
  }, []);

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
            {!companyLoading && company && hasFundThesis && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenFundThesisModal}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                disabled={isLoading}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isLoading ? "Analyzing..." : "Analyze with Fund Thesis"}
              </Button>
            )}
            
            {!companyLoading && company && (
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
      
      {/* Market Research Modal - Only show in modal */}
      <Dialog open={isResearchModalOpen} onOpenChange={setIsResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-amber-500" />
              Real-Time Market Research
            </DialogTitle>
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
              <FileText className="h-5 w-5 text-blue-600" />
              Fund Thesis Alignment
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {company && (
              <FundThesisAlignment 
                companyId={company.id.toString()} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPage;
