
import { SectionDetail } from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams();
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
        <SectionDetail section={section} isLoading={sectionLoading} />
      </div>
    </div>
  );
}

export default SectionPage;
