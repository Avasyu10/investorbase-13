
import { SectionDetail } from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const SectionPage = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId } = useParams();

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

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/company/${companyId}`)}
          className="mb-4"
        >
          <ChevronLeft className="mr-1" /> Back to Company
        </Button>
      </div>
      <SectionDetail />
    </div>
  );
};

export default SectionPage;
