
import { CompanyDetails } from "@/components/companies/CompanyDetails";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CompanyPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="mb-4"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
      </div>
      <CompanyDetails id={id || ''} />
    </div>
  );
};

export default CompanyPage;
