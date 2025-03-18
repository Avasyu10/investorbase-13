
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ReportUpload } from "@/components/reports/ReportUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const UploadReport = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (!user) {
          console.log("No authenticated user found, redirecting to login");
          navigate('/');
          return;
        }
        
        setUser(user);
        console.log("Authenticated user:", user.email);
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Authentication error - Please sign in again", {
          description: "Your session may have expired"
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/');
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleError = (errorMessage: string) => {
    toast.error("Upload error", {
      description: errorMessage
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Upload Pitch Deck</h1>
      <ReportUpload onError={handleError} />
    </div>
  );
};

export default UploadReport;
