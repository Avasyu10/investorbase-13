import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, MapPin, TrendingUp, Users, DollarSign, Globe, Target, Mail, Phone, Calendar, Award } from "lucide-react";
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

// Helper function to parse and extract top entries with counts
const parseAndShowTop = (data: string | null, topCount: number = 3) => {
  if (!data) return [];
  
  // Parse items like "Enterprise Applications (585), Consumer (280), FinTech (171)"
  const items = data.split(',').map(item => {
    const trimmed = item.trim();
    const match = trimmed.match(/^(.+?)\s*\((\d+)\)$/);
    if (match) {
      return {
        name: match[1].trim(),
        count: parseInt(match[2])
      };
    }
    return {
      name: trimmed,
      count: 0
    };
  });
  
  // Sort by count (highest first) and take top entries
  return items
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, topCount);
};

// Helper function to format Portfolio IPOs
const formatPortfolioIPOs = (ipos: string | null) => {
  if (!ipos || ipos === 'Not Available' || ipos.trim() === '') {
    return <span className="text-muted-foreground">No IPOs</span>;
  }
  
  // Split IPOs and take first 3-4, then add "... and many more" if there are more
  const ipoList = ipos.split(',').map(ipo => ipo.trim()).filter(ipo => ipo.length > 0);
  
  if (ipoList.length === 0) {
    return <span className="text-muted-foreground">No IPOs</span>;
  }
  
  if (ipoList.length <= 4) {
    return <span className="font-medium">{ipoList.join(', ')}</span>;
  }
  
  const firstFew = ipoList.slice(0, 3);
  return (
    <span className="font-medium">
      {firstFew.join(', ')}
      <span className="text-muted-foreground"> ... and {ipoList.length - 3} more</span>
    </span>
  );
};

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
              <div className="grid gap-6">
                {vcMatches.matches.map((vc, index) => (
                  <Card key={index} className="border border-muted/20 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      {/* VC Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-semibold text-foreground">
                          {vc['Investor Name']}
                        </h4>
                        <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
                          #{index + 1}
                        </Badge>
                      </div>

                       {/* VC Contact Info */}
                       {(vc['Founded Year'] || vc['City'] || vc['Investment Score'] || vc['Emails'] || vc['Phone Numbers'] || vc['Website'] || vc['LinkedIn']) && (
                         <div className="mb-6 p-4 border rounded-lg">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                             {vc['Founded Year'] && (
                               <div className="flex items-center gap-2">
                                 <Calendar className="h-4 w-4 text-blue-600" />
                                 <div>
                                   <span className="text-muted-foreground">Founded:</span>
                                   <div className="font-medium">{vc['Founded Year']}</div>
                                 </div>
                               </div>
                             )}
                             {vc['City'] && (
                               <div className="flex items-center gap-2">
                                 <MapPin className="h-4 w-4 text-green-600" />
                                 <div>
                                   <span className="text-muted-foreground">City:</span>
                                   <div className="font-medium">{vc['City']}</div>
                                 </div>
                               </div>
                             )}
                             {vc['Investment Score'] && (
                               <div className="flex items-center gap-2">
                                 <Award className="h-4 w-4 text-amber-600" />
                                 <div>
                                   <span className="text-muted-foreground">Score:</span>
                                   <div className="font-medium">{vc['Investment Score']}</div>
                                 </div>
                               </div>
                             )}
                             {(vc['Emails'] || vc['Phone Numbers'] || vc['Website'] || vc['LinkedIn']) && (
                               <div className="flex items-center gap-1">
                                 <div className="flex gap-1">
                                   {vc['Emails'] && <Mail className="h-4 w-4 text-blue-600" />}
                                   {vc['Phone Numbers'] && <Phone className="h-4 w-4 text-green-600" />}
                                   {vc['Website'] && <Globe className="h-4 w-4 text-purple-600" />}
                                   {vc['LinkedIn'] && <Building2 className="h-4 w-4 text-blue-700" />}
                                 </div>
                                 <span className="text-xs text-muted-foreground">Contact Available</span>
                               </div>
                             )}
                           </div>
                           {vc['Description'] && (
                             <div className="mt-3 pt-3 border-t">
                               <p className="text-sm text-muted-foreground line-clamp-2">{vc['Description']}</p>
                             </div>
                           )}
                         </div>
                       )}

                       {/* Only show Top Sectors, Top Locations, and Portfolio */}
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                         {/* Top Investment Sectors */}
                         <div className="border rounded-lg p-4">
                           <div className="flex items-center gap-2 mb-3">
                             <TrendingUp className="h-4 w-4 text-blue-600" />
                             <h6 className="font-medium">Top Sectors</h6>
                           </div>
                           <div className="space-y-2">
                             {parseAndShowTop(vc['Sectors of Investments - Overall'], 2).map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between">
                                 <span className="text-sm truncate">{item.name}</span>
                                 <Badge variant="secondary" className="text-xs">
                                   {item.count}
                                 </Badge>
                               </div>
                             ))}
                           </div>
                         </div>

                         {/* Top Investment Locations */}
                         <div className="border rounded-lg p-4">
                           <div className="flex items-center gap-2 mb-3">
                             <MapPin className="h-4 w-4 text-green-600" />
                             <h6 className="font-medium">Top Locations</h6>
                           </div>
                           <div className="space-y-2">
                             {parseAndShowTop(vc['Locations of Investment - Overall'], 2).map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between">
                                 <span className="text-sm truncate">{item.name}</span>
                                 <Badge variant="secondary" className="text-xs">
                                   {item.count}
                                 </Badge>
                               </div>
                             ))}
                           </div>
                         </div>

                         {/* Portfolio */}
                         <div className="border rounded-lg p-4">
                           <div className="flex items-center gap-2 mb-3">
                             <Users className="h-4 w-4 text-rose-600" />
                             <h6 className="font-medium">Portfolio</h6>
                           </div>
                           <div className="text-center mb-3">
                             <div className="text-2xl font-bold text-foreground">
                               {vc['Portfolio Count - Overall'] || 0}
                             </div>
                             <div className="text-xs text-muted-foreground">companies</div>
                           </div>
                           {vc['Portfolio IPOs - Overall'] && (
                             <div className="pt-3 border-t">
                               <h6 className="text-sm font-medium mb-2">Notable IPOs</h6>
                               <div className="text-xs leading-relaxed">
                                 {formatPortfolioIPOs(vc['Portfolio IPOs - Overall'])}
                               </div>
                             </div>
                           )}
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