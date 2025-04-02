
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type CompanyInfoProps = {
  website?: string;
  stage?: string;
  industry?: string;
  founderLinkedIns?: string[];
  introduction?: string;
  description?: string; // Added for backward compatibility
  pitchUrl?: string;    // Added for backward compatibility
  reportId?: string;    // Added for backward compatibility
};

export function CompanyInfoCard({
  website = "https://example.com",
  stage = "Not specified",
  industry = "Not specified",
  founderLinkedIns = [],
  introduction = "No detailed information available for this company.",
  description, // For backward compatibility
  pitchUrl,    // For backward compatibility
  reportId     // For backward compatibility
}: CompanyInfoProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Use introduction or description (for backward compatibility)
  const displayIntroduction = introduction || description || "No detailed information available for this company.";

  // Format website URL for display and linking
  const displayWebsite = website && website !== "https://example.com" 
    ? website.replace(/^https?:\/\/(www\.)?/, '') 
    : "Not available";
  
  const websiteUrl = website && website !== "https://example.com" 
    ? (website.startsWith('http') ? website : `https://${website}`)
    : null;

  const handleViewMore = () => {
    if (id) {
      navigate(`/company/${id}/overview`);
    }
  };

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Overview
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Website</p>
                {websiteUrl ? (
                  <a 
                    href={websiteUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    {displayWebsite}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Not available</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Stage</p>
                <p className="text-sm text-muted-foreground">{stage}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{industry}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/company-detail-page')}
            className="flex items-center gap-2 text-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Company Details
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
