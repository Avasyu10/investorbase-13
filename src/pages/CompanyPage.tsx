
import { CompanyDetails } from "@/components/companies/CompanyDetails";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const CompanyPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { id: companyId } = useParams<{ id: string }>();  // Extract companyId from URL params

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

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
      {companyId && <CompanyDetails />}
    </div>
  );
};

export default CompanyPage;
