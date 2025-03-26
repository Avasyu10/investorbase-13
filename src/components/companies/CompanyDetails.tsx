
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";
import { CompanyInfoCard } from "./CompanyInfoCard";
import { SectionsList } from "./SectionsList";
import { CompanyStatistics } from "./CompanyStatistics";
import { useNavigate, useParams } from "react-router-dom";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import { Share } from "lucide-react";
import { ShareLinkDialog } from "./ShareLinkDialog";

export function CompanyDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { company, isLoading, error } = useCompanyDetails(id || "");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleViewAnalysis = () => {
    if (id) {
      navigate(`/company/${id}/analysis`);
    }
  };

  const handleViewOverview = () => {
    if (id) {
      navigate(`/company/${id}/overview`);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading company details...</div>;
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">Company not found</h3>
        <p className="text-muted-foreground mb-4">
          The company you're looking for couldn't be found.
        </p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="text-muted-foreground mt-1">
            View detailed metrics and analysis
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5"
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex items-center gap-1.5"
            onClick={handleViewAnalysis}
          >
            <ExternalLink className="h-4 w-4" />
            View Full Analysis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <CompanyInfoCard 
          website={company.details?.website}
          stage={company.details?.stage}
          industry={company.details?.industry}
          founderLinkedIns={company.founderLinkedIns}
          introduction={company.details?.introduction}
        />
        
        <Card className="border-0 shadow-card">
          <Tabs defaultValue="sections" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
            <CardContent className="p-0">
              <TabsContent value="sections" className="mt-0">
                <SectionsList 
                  sections={company.sections} 
                  companyId={id || ""}
                />
              </TabsContent>
              <TabsContent value="statistics" className="mt-0">
                <CompanyStatistics 
                  sections={company.sections} 
                  overallScore={company.overallScore}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
          <CardFooter className="px-6 py-4 bg-muted/30 border-t">
            <Button 
              variant="outline" 
              className="ml-auto" 
              onClick={handleViewOverview}
            >
              View Company Overview <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <ShareLinkDialog 
        open={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen}
        companyId={id || ""}
        companyName={company.name}
      />
    </div>
  );
}
