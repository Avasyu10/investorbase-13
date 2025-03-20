
import { useState } from "react";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const PublicUpload = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-dismiss error after 10 seconds
    setTimeout(() => setError(null), 10000);
  };

  const handleSuccess = () => {
    setSuccess(true);
    // Reset form state after 10 seconds
    setTimeout(() => setSuccess(false), 10000);
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
        
        {success ? (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your information has been submitted successfully. We'll analyze it and send the results to your email.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Submit Your Company Information</h1>
              <p className="text-muted-foreground">
                Share information about your company to get an AI-powered analysis. 
                You can upload a PDF pitch deck (optional) and add your company website to enhance the analysis.
              </p>
            </div>
            
            <ReportUpload 
              onError={handleError} 
              onSuccess={handleSuccess}
              isPublic={true} 
              buttonText="Submit"
              skipAnalysis={true}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default PublicUpload;
