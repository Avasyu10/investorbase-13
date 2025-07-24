import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, TrendingUp, Users, Globe, Target, Mail, Phone, Calendar, Award, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VCMatch {
  'SNo.': number;
  'Investor Name': string;
  'Overview': string;
  'Founded Year': number;
  'State': string;
  'City': string;
  'Description': string;
  'Investor Type': string;
  'Practice Areas': string;
  'Investment Score': number;
  'Emails': string;
  'Phone Numbers': string;
  'Website': string;
  'LinkedIn': string;
  'Twitter': string;
  match_score?: number;
  match_reasons?: string[];
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-xl font-semibold text-foreground">
              {vc['Investor Name']}
            </h4>
            {vc.match_score && (
              <div className="text-sm text-green-600 font-medium">
                Match Score: {vc.match_score}%
              </div>
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

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section: VC Contact Info */}
          <div className="lg:col-span-2">
            {(vc['Founded Year'] || vc['City'] || vc['Investment Score'] || vc['Emails'] || vc['Phone Numbers'] || vc['Website'] || vc['LinkedIn']) && (
              <div className="p-4 border rounded-lg h-full">
                
                {/* Match Reasons */}
                {vc.match_reasons && vc.match_reasons.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h6 className="text-sm font-medium text-green-800 mb-2">Why this VC matches:</h6>
                    <ul className="text-xs text-green-700 space-y-1">
                      {vc.match_reasons.map((reason, idx) => (
                        <li key={idx}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

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
                        <span className="text-xs text-muted-foreground block">Location</span>
                        <div className="text-sm font-medium">{vc['City']}, {vc['State']}</div>
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

          {/* Right Section: Practice Areas & Overview */}
          <div className="border rounded-lg p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-rose-600" />
              <h6 className="text-base font-bold">Investment Focus</h6>
            </div>
            
            {vc['Practice Areas'] && (
              <div className="mb-4">
                <h6 className="text-sm font-medium mb-2">Practice Areas</h6>
                <div className="flex flex-wrap gap-1">
                  {vc['Practice Areas'].split(',').slice(0, 5).map((area, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {area.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {vc['Investor Type'] && (
              <div className="mb-4">
                <h6 className="text-sm font-medium mb-2">Investor Type</h6>
                <Badge variant="outline" className="text-xs">
                  {vc['Investor Type']}
                </Badge>
              </div>
            )}

            {vc['Overview'] && (
              <div className="pt-4 border-t">
                <h6 className="text-sm font-medium mb-2">Overview</h6>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {vc['Overview'].length > 200 ? `${vc['Overview'].substring(0, 200)}...` : vc['Overview']}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}