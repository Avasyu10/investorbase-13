
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ReportSectionDetail } from "@/components/reports/ReportSectionDetail";

const ReportSection = () => {
  const { id, sectionId } = useParams<{ id: string; sectionId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

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

  if (!id || !sectionId) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 transition-colors" 
        onClick={() => navigate(`/reports/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to report
      </Button>
      
      <ReportSectionDetail reportId={id} sectionId={sectionId} />
    </div>
  );
};

export default ReportSection;
