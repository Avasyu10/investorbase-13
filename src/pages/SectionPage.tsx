
import SectionDetail from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ORDERED_SECTIONS, SECTION_TITLES, SECTION_TYPES } from "@/lib/constants";
import { SectionDetailed } from "@/lib/api/apiContract";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams<{ companyId: string; sectionId: string }>();
  
  const { company, isLoading: companyLoading } = useCompanyDetails(companyId);
  const { section, isLoading: sectionLoading } = useSectionDetails(companyId, sectionId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const isLoading = authLoading || companyLoading || sectionLoading;

  const handleBackClick = () => {
    if (companyId) {
      navigate(`/company/${companyId}`);
    }
  };

  // Helper function to get standardized display title for navigation
  const getNavigationTitle = (section: any): string => {
    const sectionType = section.type?.toUpperCase();
    if (sectionType && SECTION_TITLES[sectionType as keyof typeof SECTION_TITLES]) {
      return SECTION_TITLES[sectionType as keyof typeof SECTION_TITLES];
    }
    
    const title = section.title.toLowerCase();
    if (title.includes('solution') || title.includes('product')) {
      return SECTION_TITLES[SECTION_TYPES.SOLUTION];
    }
    if (title.includes('traction') || title.includes('milestone')) {
      return SECTION_TITLES[SECTION_TYPES.TRACTION];
    }
    if (title.includes('team') || title.includes('founder')) {
      return SECTION_TITLES[SECTION_TYPES.TEAM];
    }
    if (title.includes('financial') || title.includes('projection')) {
      return SECTION_TITLES[SECTION_TYPES.FINANCIALS];
    }
    if (title.includes('ask') || title.includes('next step')) {
      return SECTION_TITLES[SECTION_TYPES.ASK];
    }
    if (title.includes('problem')) {
      return SECTION_TITLES[SECTION_TYPES.PROBLEM];
    }
    if (title.includes('market') || title.includes('opportunity')) {
      return SECTION_TITLES[SECTION_TYPES.MARKET];
    }
    if (title.includes('competitive') || title.includes('landscape')) {
      return SECTION_TITLES[SECTION_TYPES.COMPETITIVE_LANDSCAPE];
    }
    if (title.includes('business model')) {
      return SECTION_TITLES[SECTION_TYPES.BUSINESS_MODEL];
    }
    if (title.includes('go-to-market') || title.includes('strategy')) {
      return SECTION_TITLES[SECTION_TYPES.GTM_STRATEGY];
    }
    
    return section.title;
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
      <div className="container mx-auto px-4">
        {section && <SectionDetail section={section as unknown as SectionDetailed} isLoading={sectionLoading} />}
        
        <div className="flex justify-between mt-8">
          {prevSection && (
            <Button 
              variant="outline" 
              onClick={() => navigateToSection(prevSection.id)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> 
              Previous: {getNavigationTitle(prevSection)}
            </Button>
          )}
          <div></div>
          {nextSection && (
            <Button 
              variant="outline" 
              onClick={() => navigateToSection(nextSection.id)}
              className="flex items-center gap-2"
            >
              {getNavigationTitle(nextSection)} <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SectionPage;
