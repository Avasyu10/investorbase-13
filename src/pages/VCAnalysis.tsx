
import { VCAnalysisUpload } from "@/components/vc/VCAnalysisUpload";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const VCAnalysis = () => {
  const { isVC, isEximius, isLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isVC && !isEximius) {
      console.log("Non-VC and non-Eximius user attempted to access VC analysis page, redirecting");
      navigate('/dashboard');
    }
  }, [isVC, isEximius, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVC && !isEximius) {
    return null; // Will redirect in useEffect
  }

  return <VCAnalysisUpload />;
};

export default VCAnalysis;
