
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Globe, Briefcase, TrendingUp, Mail, Linkedin } from "lucide-react";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CompanyOverviewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { company, isLoading, error } = useCompanyDetails(id || "");

  const handleBackClick = () => {
    navigate(-1);
  };

  // Format website URL for display and linking
  const formatWebsiteUrl = (website?: string) => {
    if (!website || website === "https://example.com") return { display: "Not available", url: null };
    
    const displayWebsite = website.replace(/^https?:\/\/(www\.)?/, '');
    const websiteUrl = website.startsWith('http') ? website : `https://${website}`;
    
    return { display: displayWebsite, url: websiteUrl };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The company you're looking for couldn't be found or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  const websiteInfo = formatWebsiteUrl(company.details?.website);
  const stage = company.details?.stage || "Not specified";
  const industry = company.details?.industry || "Not specified";
  const introduction = company.details?.introduction || "No detailed information available for this company.";
  
  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackClick}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-2xl font-bold">{company.name}</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {stage}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    {websiteInfo.url ? (
                      <a
                        href={websiteInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      >
                        {websiteInfo.display}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{websiteInfo.display}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Industry</p>
                    <p className="text-sm text-muted-foreground">{industry}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Contact Email</p>
                    <p className="text-sm text-muted-foreground">
                      {company.submitterEmail || "Not available"}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Company Introduction</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{introduction}</p>
              </div>
              
              {company.founderLinkedIns && company.founderLinkedIns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Founder Profiles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.founderLinkedIns.map((linkedin, index) => (
                      <a
                        key={index}
                        href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Linkedin className="h-5 w-5 text-[#0A66C2]" />
                        <span className="text-sm font-medium">{linkedin.replace(/^https?:\/\/(www\.)?(linkedin\.com\/)?/, '')}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyOverviewPage;
