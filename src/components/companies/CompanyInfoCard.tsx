
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, TrendingUp, Briefcase, ExternalLink } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useState } from "react";

type CompanyInfoProps = {
  website?: string;
  stage?: string;
  industry?: string;
  founderLinkedIns?: string[];
  introduction?: string;
}

export function CompanyInfoCard({
  website = "",
  stage = "Not specified",
  industry = "Not specified",
  founderLinkedIns = [],
  introduction = "No detailed information available for this company."
}: CompanyInfoProps) {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  
  const formattedWebsite = website ? (website.startsWith('http') ? website : `https://${website}`) : "";
  const displayWebsite = website || "Not available";
  const displayStage = stage || "Not specified";
  const displayIndustry = industry || "Not specified";

  return (
    <div className="mb-7">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        Company Information
      </h3>
      
      <Card className="border-0 shadow-card">
        <CardContent className="p-4 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Website</p>
                {website ? (
                  <a 
                    href={formattedWebsite}
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
                <p className="text-sm text-muted-foreground">{displayStage}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Industry</p>
                <p className="text-sm text-muted-foreground">{displayIndustry}</p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex justify-end border-t bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1.5 transition-colors"
            onClick={() => setShowMoreInfo(true)}
          >
            View More <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showMoreInfo} onOpenChange={setShowMoreInfo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Additional Company Information</DialogTitle>
          </DialogHeader>

          <div>
            <h4 className="text-base font-medium mb-2">About</h4>
            <p className="text-muted-foreground">{introduction}</p>
          </div>
        
          {founderLinkedIns && founderLinkedIns.length > 0 && (
            <div className="space-y-6 py-4">
              <div>
                <h4 className="text-base font-medium mb-2">Founders</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {founderLinkedIns.map((linkedin, index) => (
                    <li key={index}>
                      <a 
                        href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
