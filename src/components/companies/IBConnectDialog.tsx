import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { VCMatchCard } from "./VCMatchCard";

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
  'Portfolio IPOs - Overall': string;
  // From vccontact table
  'Founded Year'?: number;
  'City'?: string;
  'Description'?: string;
  'Investment Score'?: number;
  'Emails'?: string;
  'Phone Numbers'?: string;
  'Website'?: string;
  'LinkedIn'?: string;
}

interface VCMatchResponse {
  matches: VCMatch[];
  totalMatches: number;
  companySectors: string;
  companyStages: string;
  companyName: string;
}

export function IBConnectDialog({
  companyId,
  companyName
}: IBConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: vcMatches,
    isLoading,
    error
  } = useQuery({
    queryKey: ['vc-matches', companyId],
    queryFn: async (): Promise<VCMatchResponse> => {
      const {
        data,
        error
      } = await supabase.functions.invoke('vc-connect', {
        body: {
          companyId
        }
      });
      if (error) {
        console.error('VC Connect error:', error);
        throw new Error(error.message || 'Failed to find VC matches');
      }
      return data;
    },
    enabled: isOpen && !!companyId
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
        <Button variant="outline" size="sm" className="h-10 px-4 border-yellow-600 hover:border-yellow-500 text-zinc-950 bg-yellow-500 hover:bg-yellow-400">
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
            {/* Results summary */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Found Top {vcMatches.totalMatches} matching VCs
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
              <div className="grid gap-6">
                {vcMatches.matches.map((vc, index) => (
                  <VCMatchCard 
                    key={index} 
                    vc={vc} 
                    index={index} 
                    companyId={companyId}
                    companyName={companyName}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}