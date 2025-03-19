
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const UploadReport = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: '/upload' } });
    }
  }, [user, isLoading, navigate]);

  // Reset error when component unmounts or on route change
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-dismiss error after 10 seconds
    setTimeout(() => setError(null), 10000);
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null; // Will redirect in useEffect

  return (
    <div className="animate-fade-in">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackClick}
          className="mb-6"
        >
          <ChevronLeft className="mr-1" /> Back
        </Button>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Upload New Pitch Deck</h1>
          <p className="text-muted-foreground">
            Upload a PDF pitch deck to get an AI-powered analysis of its strengths and weaknesses.
            Adding your company website will enhance the analysis with additional context.
          </p>
        </div>
        
        <ReportUpload onError={handleError} />
      </div>
    </div>
  );
};

export default UploadReport;
