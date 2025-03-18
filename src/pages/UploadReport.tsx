import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const UploadReport = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('processing') === 'true') {
      setIsProcessing(true);
    }

    const checkAuth = async () => {
      try {
        setCheckingAuth(true);
        console.log("Checking authentication in UploadReport");
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error fetching session:", error);
          setError("Authentication error: " + error.message);
          return;
        }
        
        if (!data.session) {
          console.log("No active session found in UploadReport");
          if (!isProcessing) {
            navigate('/login', { state: { from: '/upload' } });
          }
          return;
        }
        
        console.log("Valid session found in UploadReport");
        setValidSession(true);
      } catch (err) {
        console.error("Exception checking auth:", err);
        setError("Unexpected error during authentication check");
      } finally {
        setCheckingAuth(false);
      }
    };
    
    if (!isLoading) {
      if (!user) {
        console.log("No authenticated user in UploadReport, checking session");
        checkAuth();
      } else {
        console.log("User is authenticated in UploadReport");
        setValidSession(true);
        setCheckingAuth(false);
      }
    }
  }, [user, isLoading, navigate, location.search, isProcessing]);

  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  const handleError = (errorMessage: string) => {
    console.error("Error in UploadReport:", errorMessage);
    setError(errorMessage);
    setTimeout(() => setError(null), 10000);
    
    if (errorMessage.toLowerCase().includes("not authenticated") || 
        errorMessage.toLowerCase().includes("authentication required")) {
      if (!isProcessing) {
        navigate('/login', { state: { from: '/upload' } });
      }
    }
  };

  const handleProcessingStateChange = (processing: boolean) => {
    setIsProcessing(processing);
    
    const url = new URL(window.location.href);
    if (processing) {
      url.searchParams.set('processing', 'true');
    } else {
      url.searchParams.delete('processing');
    }
    
    window.history.replaceState({}, '', url.toString());
  };

  if (isLoading || checkingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verifying authentication...</span>
      </div>
    );
  }

  if (!validSession && !user && !isProcessing) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>You need to be logged in to upload reports.</AlertDescription>
        </Alert>
        <Button 
          variant="default" 
          className="mt-4"
          onClick={() => navigate('/login', { state: { from: '/upload' } })}
        >
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!isProcessing) {
              navigate('/dashboard');
            } else {
              toast.warning("Analysis in progress", {
                description: "Please wait for the analysis to complete before navigating away."
              });
            }
          }}
          className="mb-6"
          disabled={isProcessing}
        >
          <ChevronLeft className="mr-1" /> Back to Dashboard
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
        
        <ReportUpload 
          onError={handleError} 
          onProcessingStateChange={handleProcessingStateChange}
        />
      </div>
    </div>
  );
};

export default UploadReport;
