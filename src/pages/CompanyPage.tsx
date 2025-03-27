
import { CompanyDetails } from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sparkle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { getLatestResearch } from "@/lib/supabase/research";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const { company, isLoading } = useCompanyDetails(id);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  
  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenResearchModal = async () => {
    setIsResearchModalOpen(true);
    
    if (!researchData && company) {
      try {
        setIsResearchLoading(true);
        const assessmentText = company.assessmentPoints?.join('\n\n') || '';
        const data = await getLatestResearch(company.id.toString(), assessmentText);
        setResearchData(data);
      } catch (error) {
        console.error("Error fetching research:", error);
      } finally {
        setIsResearchLoading(false);
      }
    }
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
      
      <CompanyDetails />
      
      {/* Research Modal */}
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
              <div className="prose max-w-none">
                {isResearchLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-muted-foreground">Analyzing market data...</p>
                  </div>
                ) : researchData?.research ? (
                  <div className="mt-2 overflow-y-auto max-h-[60vh]">
                    <div dangerouslySetInnerHTML={{ __html: researchData.research }} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No research data available yet.</p>
                    <Button 
                      className="mt-4 bg-amber-500 hover:bg-amber-600"
                      onClick={async () => {
                        if (company) {
                          try {
                            setIsResearchLoading(true);
                            const assessmentText = company.assessmentPoints?.join('\n\n') || '';
                            const data = await getLatestResearch(company.id.toString(), assessmentText);
                            setResearchData(data);
                          } catch (error) {
                            console.error("Error fetching research:", error);
                          } finally {
                            setIsResearchLoading(false);
                          }
                        }
                      }}
                    >
                      <Sparkle className="mr-2 h-4 w-4" />
                      Start Research
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPage;
