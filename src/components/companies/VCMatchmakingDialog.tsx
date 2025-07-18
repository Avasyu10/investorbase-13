import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, ExternalLink, Building2, DollarSign, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VCMatch {
  fund_name: string;
  areas_of_interest: string[];
  investment_stage: string[];
  fund_size?: string;
  website_url?: string;
}

interface VCMatchmakingResponse {
  matches: VCMatch[];
  companyInfo: {
    stage: string;
    industry: string;
  };
  totalMatches: number;
}

interface VCMatchmakingDialogProps {
  companyId: string;
  companyName: string;
}

export const VCMatchmakingDialog = ({ companyId, companyName }: VCMatchmakingDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<VCMatch[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{ stage: string; industry: string } | null>(null);

  const handleVCMatchmaking = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vc-matchmaking', {
        body: { companyId }
      });

      if (error) {
        console.error('Error calling VC matchmaking function:', error);
        toast({
          title: "Error",
          description: "Failed to find VC matches. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const response: VCMatchmakingResponse = data;
      setMatches(response.matches);
      setCompanyInfo(response.companyInfo);

      if (response.matches.length === 0) {
        toast({
          title: "No Matches Found",
          description: "No VCs found matching your company's stage and industry.",
        });
      } else {
        toast({
          title: "Matches Found!",
          description: `Found ${response.matches.length} potential VC matches.`,
        });
      }
    } catch (error) {
      console.error('Error in VC matchmaking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    if (matches.length === 0) {
      handleVCMatchmaking();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleOpenDialog}
          className="flex items-center gap-2"
          variant="default"
        >
          <Handshake className="h-4 w-4" />
          VC Matchmaking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            VC Matchmaking for {companyName}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Finding matching VCs...</p>
          </div>
        ) : (
          <div className="mt-4">
            {companyInfo && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Company Profile</h3>
                <div className="flex gap-4">
                  <Badge variant="outline">
                    <Building2 className="h-3 w-3 mr-1" />
                    {companyInfo.industry || "Industry not specified"}
                  </Badge>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {companyInfo.stage || "Stage not specified"}
                  </Badge>
                </div>
              </div>
            )}

            {matches.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Potential VC Matches ({matches.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((match, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{match.fund_name}</span>
                          {match.website_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(match.website_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {match.fund_size && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Fund Size: {match.fund_size}</span>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-sm font-medium mb-2">Investment Stages:</p>
                          <div className="flex flex-wrap gap-1">
                            {match.investment_stage.map((stage, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {stage}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">Areas of Interest:</p>
                          <div className="flex flex-wrap gap-1">
                            {match.areas_of_interest.map((area, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : !isLoading && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Matches Found</h3>
                <p className="text-muted-foreground">
                  No VCs were found matching your company's stage and industry criteria.
                  You might want to try expanding your search or contact us for manual matching.
                </p>
                <Button 
                  onClick={handleVCMatchmaking} 
                  variant="outline" 
                  className="mt-4"
                >
                  Retry Search
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};