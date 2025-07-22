import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, MapPin, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

interface IBConnectDialogProps {
  companyId: string;
  companyName: string;
}

interface VCMatch {
  'Investor Name': string;
  'Sectors of Investments - Overall': string;
  'Stages of Entry - Overall': string;
  'Portfolio Count - Overall': number;
  'Locations of Investment - Overall': string;
}

interface VCMatchResponse {
  matches: VCMatch[];
  totalMatches: number;
  companySectors: string;
  companyStages: string;
  companyName: string;
}

export function IBConnectDialog({ companyId, companyName }: IBConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: vcMatches, isLoading, error } = useQuery({
    queryKey: ['vc-matches', companyId],
    queryFn: async (): Promise<VCMatchResponse> => {
      const { data, error } = await supabase.functions.invoke('vc-connect', {
        body: { companyId }
      });

      if (error) {
        console.error('VC Connect error:', error);
        throw new Error(error.message || 'Failed to find VC matches');
      }

      return data;
    },
    enabled: isOpen && !!companyId,
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && error) {
      toast.error("Failed to load VC matches. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
        >
          <Building2 className="h-4 w-4 mr-2" />
          IB Connect
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            VC Matches for {companyName}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Finding matching VCs...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Failed to load VC matches. Please try again.</p>
          </div>
        )}

        {vcMatches && (
          <div className="space-y-6">
            {/* Company matching criteria */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Matching Criteria</h3>
              <div className="space-y-2">
                {vcMatches.companySectors && (
                  <div>
                    <span className="text-sm font-medium">Sectors: </span>
                    <span className="text-sm text-muted-foreground">
                      {vcMatches.companySectors}
                    </span>
                  </div>
                )}
                {vcMatches.companyStages && (
                  <div>
                    <span className="text-sm font-medium">Stages: </span>
                    <span className="text-sm text-muted-foreground">
                      {vcMatches.companyStages}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Results summary */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Found {vcMatches.totalMatches} matching VCs
              </h3>
            </div>

            {/* VC matches */}
            {vcMatches.matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No matching VCs found based on your company's sectors and stages.</p>
                <p className="text-sm mt-1">
                  This might indicate that your analysis doesn't contain specific sector/stage information.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {vcMatches.matches.map((vc, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-lg">
                          {vc['Investor Name']}
                        </h4>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          #{index + 1}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            Investment Sectors
                          </div>
                          <p className="text-sm font-medium">
                            {vc['Sectors of Investments - Overall'] || 'Not specified'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Entry Stages
                          </div>
                          <p className="text-sm font-medium">
                            {vc['Stages of Entry - Overall'] || 'Not specified'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            Portfolio Count
                          </div>
                          <p className="text-sm font-medium">
                            {vc['Portfolio Count - Overall'] || 0} companies
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            Locations
                          </div>
                          <p className="text-sm font-medium">
                            {vc['Locations of Investment - Overall'] || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}