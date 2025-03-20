
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReportUpload } from "@/components/reports/ReportUpload";

interface FormDetails {
  id: string;
  form_name: string;
  user_id: string;
}

const PublicFormUpload = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formDetails, setFormDetails] = useState<FormDetails | null>(null);

  useEffect(() => {
    const loadFormDetails = async () => {
      if (!slug) {
        setError("Form not found");
        setLoading(false);
        return;
      }

      try {
        // Get form details by slug
        const { data, error } = await supabase
          .from("public_submission_forms")
          .select("id, form_name, user_id")
          .eq("form_slug", slug)
          .eq("is_active", true)
          .single();

        if (error || !data) {
          console.error("Error loading form:", error);
          setError("Form not found or no longer active");
          setLoading(false);
          return;
        }

        setFormDetails(data);
      } catch (err) {
        console.error("Error fetching form details:", err);
        setError("An error occurred while loading the form");
      } finally {
        setLoading(false);
      }
    };

    loadFormDetails();
  }, [slug]);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-dismiss error after 10 seconds
    setTimeout(() => setError(null), 10000);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !formDetails) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Form not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight mb-2">{formDetails.form_name}</h1>
          <p className="text-muted-foreground">
            Submit your pitch deck to get valuable feedback. Your submission will be stored securely.
          </p>
        </div>

        <ReportUpload 
          onError={handleError} 
          isPublic={true} 
          targetUserId={formDetails.user_id}
          formId={formDetails.id}
          submitButtonText="Submit"
        />
      </div>
    </div>
  );
};

export default PublicFormUpload;
