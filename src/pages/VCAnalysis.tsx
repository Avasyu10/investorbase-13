
import { VCAnalysisUpload } from "@/components/vc/VCAnalysisUpload";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const VCAnalysis = () => {
  const { isVC, isLoading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isVC) {
      console.log("Non-VC user attempted to access VC analysis page, redirecting");
      navigate('/dashboard');
    }
  }, [isVC, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVC) {
    return null; // Will redirect in useEffect
  }

  return <VCAnalysisUpload />;
};

export default VCAnalysis;
