
import { SectionDetail } from "@/components/companies/SectionDetail";
import { FundThesisAlignment } from "@/components/companies/FundThesisAlignment";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, BookText } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ORDERED_SECTIONS } from "@/lib/constants";
import { SectionDetailed } from "@/lib/api/apiContract";
import { InvestorResearch } from "@/components/companies/InvestorResearch";
import { supabase } from "@/integrations/supabase/client";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams<{ companyId: string; sectionId: string }>();
  
  const { company, isLoading: companyLoading } = useCompanyDetails(companyId);
  const { section, isLoading: sectionLoading } = useSectionDetails(companyId, sectionId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvestorResearchModalOpen, setIsInvestorResearchModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }

    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    getUserId();
  }, [user, authLoading, navigate]);

  const isLoading = authLoading || companyLoading || sectionLoading;

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleOpenInvestorResearchModal = () => {
    if (!company) return;
    setIsInvestorResearchModalOpen(true);
  };

  const getAdjacentSections = () => {
    if (!company || !section) return { prevSection: null, nextSection: null };
    
    const sortedSections = [...company.sections].sort((a, b) => {
      const indexA = ORDERED_SECTIONS.indexOf(a.type);
      const indexB = ORDERED_SECTIONS.indexOf(b.type);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return 0;
    });
    
    const currentIndex = sortedSections.findIndex(s => s.id.toString() === sectionId);
    
    if (currentIndex === -1) return { prevSection: null, nextSection: null };
    
    const prevSection = currentIndex > 0 ? sortedSections[currentIndex - 1] : null;
    const nextSection = currentIndex < sortedSections.length - 1 ? sortedSections[currentIndex + 1] : null;
    
    return { prevSection, nextSection };
  };

  const { prevSection, nextSection } = getAdjacentSections();

  const navigateToSection = (sectionId: string | number) => {
    navigate(`/company/${companyId}/section/${sectionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
          
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
            
            {company?.reportId && (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Deck
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogDescription className="sr-only">
                    View the pitch deck document
                  </DialogDescription>
                  <div className="flex-1 overflow-auto">
                    <ReportViewer reportId={company.reportId} />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4">
        {/* Overall Assessment */}
        {!isLoading && company && (
          <OverallAssessment score={4.7} />
        )}
        
        {section && <SectionDetail section={section as unknown as SectionDetailed} isLoading={sectionLoading} />}
        
        {/* Fund Thesis Alignment Component */}
        {!isLoading && company && (
          <FundThesisAlignment 
            companyId={companyId || ''} 
            companyName={company.name} 
          />
        )}
        
        <div className="flex justify-between mt-8">
          {prevSection && (
            <Button 
              variant="outline" 
              onClick={() => navigateToSection(prevSection.id)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> 
              Previous: {prevSection.title}
            </Button>
          )}
          <div></div>
          {nextSection && (
            <Button 
              variant="outline" 
              onClick={() => navigateToSection(nextSection.id)}
              className="flex items-center gap-2"
            >
              {nextSection.title} <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>
      </div>

      {/* Investor Research Modal */}
      <Dialog open={isInvestorResearchModalOpen} onOpenChange={setIsInvestorResearchModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogDescription className="sr-only">
            Comprehensive investor-focused research and analysis
          </DialogDescription>
          
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
}

export default SectionPage;
