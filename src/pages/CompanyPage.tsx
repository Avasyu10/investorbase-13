
import CompanyDetails from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, isLoading } = useCompanyDetails(id);
  
  const handleBack = () => {
    navigate(-1);
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
        </div>
      </div>
      
      <CompanyDetails />
    </div>
  );
};

export default CompanyPage;
