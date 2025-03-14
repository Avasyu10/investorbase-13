
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const UploadReport = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

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
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ChevronLeft className="mr-1" /> Back to Dashboard
        </Button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Analyze Company Website</h1>
          <p className="text-muted-foreground">
            Enter a company website URL to get an AI-powered analysis of the business
          </p>
        </div>
        
        <ReportUpload />
      </div>
    </div>
  );
};

export default UploadReport;
