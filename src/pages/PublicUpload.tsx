
import { useState } from "react";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

const PublicUpload = () => {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleError = (errorMessage: string) => {
    console.error("Public upload error:", errorMessage);
    
    // Extract more details if available
    const detailsMatch = errorMessage.match(/Upload failed: (.*)/);
    if (detailsMatch && detailsMatch[1]) {
      setError("Upload failed");
      setErrorDetails(detailsMatch[1]);
    } else {
      setError(errorMessage);
      setErrorDetails(null);
    }
    
    // Auto-dismiss error after 30 seconds
    setTimeout(() => {
      setError(null);
      setErrorDetails(null);
    }, 30000);
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
            <AlertDescription>
              {error}
              {errorDetails && (
                <div className="mt-2 text-sm bg-red-50 p-2 rounded border border-red-200">
                  <details>
                    <summary className="cursor-pointer font-medium">Debug details</summary>
                    <p className="mt-1 whitespace-pre-wrap">{errorDetails}</p>
                  </details>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Debug Mode</AlertTitle>
          <AlertDescription className="text-blue-700">
            The upload form is in debug mode. Check the browser console for detailed logs.
          </AlertDescription>
        </Alert>
        
        {success ? (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your pitch deck has been submitted successfully. We'll analyze it and send the results to your email.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Submit Your Pitch Deck</h1>
              <p className="text-muted-foreground">
                Upload a PDF pitch deck to get an AI-powered analysis of its strengths and weaknesses.
                Adding your company website will enhance the analysis with additional context.
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
};

export default PublicUpload;
