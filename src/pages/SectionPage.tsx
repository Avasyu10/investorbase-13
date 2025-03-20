
import { SectionDetail } from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams();
  const { company, isLoading: companyLoading } = useCompanyDetails(companyId);
  const { section, isLoading: sectionLoading } = useSectionDetails(companyId, sectionId);

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-4"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
      </div>
      <div className="container mx-auto px-4">
        <SectionDetail section={section} isLoading={sectionLoading} />
      </div>
    </div>
  );
}

export default SectionPage;
