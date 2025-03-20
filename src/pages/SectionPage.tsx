
import { SectionDetail } from "@/components/companies/SectionDetail";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, AlertTriangle } from "lucide-react";
import { useCompanyDetails, useSectionDetails } from "@/hooks/useCompanies";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReportViewer } from "@/components/reports/ReportViewer";
import { toast } from "@/hooks/use-toast";

const SectionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { companyId, sectionId } = useParams();
  const { company, isLoading: companyLoading, error: companyError } = useCompanyDetails(companyId);
  const { section, isLoading: sectionLoading, error: sectionError } = useSectionDetails(companyId, sectionId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (sectionError) {
      toast({
        title: "Error loading section",
        description: "There was a problem loading the section details. You may not have permission to view this content.",
        variant: "destructive"
      });
    }
  }, [sectionError]);

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  const isLoading = authLoading || companyLoading || sectionLoading;
  const hasError = !!companyError || !!sectionError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Content Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            {!user ? 
              "You need to sign in to view this content." : 
              "You don't have permission to view this content or it doesn't exist."}
          </p>
          {!user && (
            <Button asChild variant="default">
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
          
          {company?.reportId && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Deck
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                  <ReportViewer reportId={company.reportId} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="container mx-auto px-4">
        <SectionDetail section={section} isLoading={sectionLoading} />
      </div>
    </div>
  );
}

export default SectionPage;
