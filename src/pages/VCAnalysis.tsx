
import { VCAnalysisUpload } from "@/components/reports/VCAnalysisUpload";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const VCAnalysis = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isVC, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        console.log("VCAnalysis - User not authenticated, redirecting to home");
        navigate('/', { state: { from: '/vc-analysis' } });
      } else if (!isVC) {
        console.log("VCAnalysis - User is not VC, redirecting to dashboard");
        navigate('/dashboard');
      }
    }
  }, [user, isVC, authLoading, profileLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isVC) {
    return null; // Will redirect in useEffect
  }

  return <VCAnalysisUpload />;
};

export default VCAnalysis;
