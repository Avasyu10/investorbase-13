
import { ExternalLink, Info, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

interface CompanyInfoCardProps {
  name: string;
  website?: string | null;
  stage?: string | null;
  industry?: string | null;
  founderProfiles?: string[] | null;
  introduction?: string | null;
}

export function CompanyInfoCard({
  name,
  website,
  stage,
  industry,
  founderProfiles = [],
  introduction
}: CompanyInfoCardProps) {
  const hasDetailedInfo = (founderProfiles && founderProfiles.length > 0) || introduction;
  
  return (
    <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/20 via-secondary/10 to-background">
      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {website && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Website</h3>
              <a 
                href={website.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {website.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {stage && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Stage</h3>
              <p>{stage}</p>
            </div>
          )}

          {industry && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Industry</h3>
              <p>{industry}</p>
            </div>
          )}
        </div>

        {hasDetailedInfo && (
          <div className="flex justify-end mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                  View More
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{name} - Company Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {founderProfiles && founderProfiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Founder LinkedIn Profiles
                      </h3>
                      <div className="space-y-2">
                        {founderProfiles.map((profile, index) => (
                          profile && (
                            <a 
                              key={index}
                              href={profile.startsWith('http') ? profile : `https://${profile}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              {profile.replace(/^https?:\/\//, '')}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {introduction && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Brief Introduction</h3>
                      <p className="text-sm">{introduction}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
