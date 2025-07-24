import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, TrendingUp, Users, Globe, Target, Mail, Phone, Calendar, Award, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VCMatch {
  'Investor Name': string;
  'Sectors of Investments - Overall': string;
  'Stages of Entry - Overall': string;
  'Portfolio Count - Overall': number;
  'Locations of Investment - Overall': string;
  'Portfolio IPOs - Overall': string;
  'Founded Year'?: number;
  'City'?: string;
  'Description'?: string;
  'Investment Score'?: number;
  'Emails'?: string;
  'Phone Numbers'?: string;
  'Website'?: string;
  'LinkedIn'?: string;
  'Match Percentage'?: number;
  'Match Reason'?: string;
}

interface VCMatchCardProps {
  vc: VCMatch;
  index: number;
  companyId: string;
  companyName: string;
}

// Helper function to parse and extract top entries without displaying counts
const parseAndShowTop = (data: string | null, topCount: number = 3) => {
  if (!data) return [];

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

  return items.filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, topCount);
};

// Helper function to format Portfolio IPOs
const formatPortfolioIPOs = (ipos: string | null) => {
  if (!ipos || ipos === 'Not Available' || ipos.trim() === '') {
    return <span className="text-muted-foreground">No IPOs</span>;
  }

  const ipoList = ipos.split(',').map(ipo => ipo.trim()).filter(ipo => ipo.length > 0);
  if (ipoList.length === 0) {
    return <span className="text-muted-foreground">No IPOs</span>;
  }

  return <div className="text-xs leading-relaxed font-medium">
      {ipoList.join(', ')}
    </div>;
};

export function VCMatchCard({ vc, index, companyId, companyName }: VCMatchCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const { data, error } = await supabase.functions.invoke('vc-connect-request', {
        body: {
          companyId,
          companyName,
          vcData: vc,
          message: `${companyName} would like to connect with ${vc['Investor Name']}`
        }
      });

      if (error) {
        console.error('Connection request error:', error);
        toast({
          title: "Error",
          description: "Failed to send connection request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success!",
        description: `Connection request sent to ${vc['Investor Name']}!`,
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="border border-muted/20 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* VC Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-semibold text-foreground">
              {vc['Investor Name']}
            </h4>
            {vc['Match Percentage'] && (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 font-medium">
                {vc['Match Percentage']}% match
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
              #{index + 1}
            </Badge>
          </div>
        </div>

        {/* Match Reason */}
        {vc['Match Reason'] && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Why this match:</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">{vc['Match Reason']}</p>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section: VC Contact Info */}
          <div className="lg:col-span-2">
            {(vc['Founded Year'] || vc['City'] || vc['Investment Score'] || vc['Emails'] || vc['Phone Numbers'] || vc['Website'] || vc['LinkedIn']) && (
              <div className="p-4 border rounded-lg h-full">
                {/* Basic Info */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {vc['Founded Year'] && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Founded</span>
                        <div className="text-sm font-medium">{vc['Founded Year']}</div>
                      </div>
                    </div>
                  )}
                  {vc['City'] && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-xs text-muted-foreground block">City</span>
                        <div className="text-sm font-medium">
                          {vc['City'].split(',').slice(0, 3).map(city => city.trim()).join(', ')}
                          {vc['City'].split(',').length > 3 && ` +${vc['City'].split(',').length - 3} more`}
                        </div>
                      </div>
                    </div>
                  )}
                  {vc['Investment Score'] && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-600" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Investment Score</span>
                        <div className="text-sm font-medium">{vc['Investment Score']}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Details */}
                <div className="space-y-3 mb-4">
                  {vc['Emails'] && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground block">Email</span>
                        <div className="text-sm font-medium break-words">{vc['Emails']}</div>
                      </div>
                    </div>
                  )}
                  {vc['Phone Numbers'] && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground block">Phone</span>
                        <div className="text-sm font-medium break-words">{vc['Phone Numbers']}</div>
                      </div>
                    </div>
                  )}
                  {vc['Website'] && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground block">Website</span>
                        <a 
                          href={vc['Website'].startsWith('http') ? vc['Website'] : `https://${vc['Website']}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
                        >
                          {vc['Website']}
                        </a>
                      </div>
                    </div>
                  )}
                  {vc['LinkedIn'] && (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-blue-700 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground block">LinkedIn</span>
                        <a 
                          href={vc['LinkedIn'].startsWith('http') ? vc['LinkedIn'] : `https://${vc['LinkedIn']}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-words"
                        >
                          {vc['LinkedIn']}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {vc['Description'] && (
                  <div className="pt-4 border-t">
                    <h6 className="text-sm font-medium mb-2">About</h6>
                    <p className="text-sm text-muted-foreground leading-relaxed">{vc['Description']}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Section: Portfolio */}
          <div className="border rounded-lg p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-rose-600" />
              <h6 className="text-base font-bold">Portfolio</h6>
            </div>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-foreground">
                {vc['Portfolio Count - Overall'] || 0}
              </div>
              <div className="text-sm text-muted-foreground">companies</div>
            </div>
            {vc['Portfolio IPOs - Overall'] && (
              <div className="pt-4 border-t">
                <h6 className="text-sm font-medium mb-2">Notable IPOs</h6>
                <div className="text-xs leading-relaxed">
                  {formatPortfolioIPOs(vc['Portfolio IPOs - Overall'])}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Investment Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Top Investment Sectors */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h6 className="text-base font-bold">Top Sectors Invested in</h6>
            </div>
            <div className="space-y-2">
              {parseAndShowTop(vc['Sectors of Investments - Overall'], 3).map((item, idx) => (
                <div key={idx} className="text-sm">
                  {item.name}
                </div>
              ))}
            </div>
          </div>

          {/* Top Investment Stages */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-purple-600" />
              <h6 className="text-base font-bold">Top Stages Invested in</h6>
            </div>
            <div className="space-y-2">
              {parseAndShowTop(vc['Stages of Entry - Overall'], 3).map((item, idx) => (
                <div key={idx} className="text-sm">
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}