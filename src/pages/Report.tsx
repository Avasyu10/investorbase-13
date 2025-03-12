
import { useParams, useNavigate } from "react-router-dom";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Report = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 transition-colors" 
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to reports
      </Button>
      
      <ReportViewer reportId={id} />
    </div>
  );
};

export default Report;
