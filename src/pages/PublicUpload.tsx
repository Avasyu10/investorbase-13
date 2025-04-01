
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  form_name: string;
  user_id: string;
  is_active: boolean;
  auto_analyze: boolean;
}

const PublicUpload = () => {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get form slug from either the URL route parameter or query parameter
  const { formSlug } = useParams();
  const [searchParams] = useSearchParams();
  const queryFormSlug = searchParams.get('form');
  
  // Use whichever form slug is available
  const activeFormSlug = formSlug || queryFormSlug;

  useEffect(() => {
    const fetchFormData = async () => {
      if (!activeFormSlug) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching form data for slug:", activeFormSlug);
        const { data, error } = await supabase
          .from('public_submission_forms')
          .select('form_name, user_id, is_active, auto_analyze')
          .eq('form_slug', activeFormSlug)
          .maybeSingle();

        if (error) {
          console.error("Error fetching form data:", error);
          setError("Form not found");
          setErrorDetails(error.message);
        } else if (!data) {
          setError("Form not found");
        } else if (!data.is_active) {
          setError("This form is no longer active");
        } else {
          console.log("Form data loaded successfully:", data);
          setFormData(data);
        }
      } catch (err: any) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
        setErrorDetails(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [activeFormSlug]);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Toaster position="top-center" />
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-8 w-64 bg-secondary rounded"></div>
          <div className="h-4 w-48 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-6 flex flex-col items-center">
        {error && (
          <Alert variant="destructive" className="mb-6 w-full max-w-2xl">
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
        
        {success ? (
          <Alert className="mb-6 bg-green-50 border-green-200 w-full max-w-2xl">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your pitch deck has been submitted successfully.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                {formData ? formData.form_name : "Submit Your Pitch Deck"}
              </h1>
              <p className="text-muted-foreground">
                Upload a PDF of your Pitch Deck along with the following information
              </p>
            </div>
            
            <ReportUpload 
              onError={handleError} 
              onSuccess={handleSuccess}
              isPublic={true} 
              buttonText="Submit"
              skipAnalysis={!formData?.auto_analyze}
              formSlug={activeFormSlug}
              hideEmailField={false}
              disableScrapingFeatures={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicUpload;
