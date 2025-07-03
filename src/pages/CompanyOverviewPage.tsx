
import { SectionDetail } from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { ORDERED_SECTIONS } from "@/lib/constants";
import { SectionDetailed } from "@/lib/api/apiContract";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams<{ companyId: string; sectionId: string }>();
  
  // Ensure we have valid IDs, converting string to number when needed for API calls
  const companyIdNum = companyId ? parseInt(companyId, 10) : undefined;
  const sectionIdNum = sectionId ? parseInt(sectionId, 10) : undefined;
  
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
    navigate(-1); // Navigate to the previous page in history
  };

  // Get adjacent sections (previous and next) based on the ordered array
  const getAdjacentSections = () => {
    if (!company || !section) return { prevSection: null, nextSection: null };
    
    // Sort sections according to the ordered array
    const sortedSections = [...company.sections].sort((a, b) => {
      const indexA = ORDERED_SECTIONS.indexOf(a.type as typeof ORDERED_SECTIONS[number]);
      const indexB = ORDERED_SECTIONS.indexOf(b.type as typeof ORDERED_SECTIONS[number]);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return 0;
    });
    
    // Find current section index
    const currentIndex = sortedSections.findIndex(s => s.id.toString() === sectionId);
    
    if (currentIndex === -1) return { prevSection: null, nextSection: null };
    
    // Get previous and next sections
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
        
        {/* Previous/Next Navigation */}
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
          <div></div> {/* Spacer */}
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
    </div>
  );
}

export default SectionPage;
