
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const PublicUpload = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-dismiss error after 10 seconds
    setTimeout(() => setError(null), 10000);
  };

  return (
    <div className="animate-fade-in">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Submit Your Pitch Deck</h1>
          <p className="text-muted-foreground">
            Upload a PDF pitch deck to get an AI-powered analysis of its strengths and weaknesses.
            Adding your company website will enhance the analysis with additional context.
          </p>
        </div>
        
        <ReportUpload onError={handleError} isPublic={true} />
      </div>
    </div>
  );
};

export default PublicUpload;
