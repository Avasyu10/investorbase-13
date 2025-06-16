
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Calendar, MapPin, Globe, ExternalLink, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CompanyScrapingDialogProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScrapedData {
  name: string | null;
  description: string | null;
  founded_year: string | null;
  employees_count: number | string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  facebook_url?: string[] | null;
  instagram_url?: string[] | null;
  hq_full_address?: string | null;
}

export function CompanyScrapingDialog({ 
  companyId, 
  companyName, 
  open, 
  onOpenChange 
}: CompanyScrapingDialogProps) {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScraped, setHasScraped] = useState(false);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setLinkedInUrl('');
      setScrapedData(null);
      setIsLoading(false);
      setError(null);
      setHasScraped(false);
    }
  }, [open]);

  const handleScrapeCompany = async () => {
    if (!linkedInUrl.trim()) {
      setError('Please enter a LinkedIn URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScrapedData(null);

    try {
      console.log("Starting scraping process for URL:", linkedInUrl);
      
      // Use the supabase client to invoke the edge function
      const { data, error: functionError } = await supabase.functions.invoke('scrape-company-direct', {
        body: { linkedInUrl: linkedInUrl.trim() }
      });

      console.log("Function response:", { data, error: functionError });

      if (functionError) {
        console.error("Function invocation error:", functionError);
        throw new Error(`Failed to invoke function: ${functionError.message}`);
      }

      if (!data) {
        throw new Error("No response data received from the scraping service");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.data) {
        console.log("Scraping completed successfully:", data.data);
        setScrapedData(data.data);
        setHasScraped(true);
        toast({
          title: "Information Retrieved",
          description: "Company information has been successfully extracted from LinkedIn.",
        });
      } else {
        throw new Error("No data received from scraping service");
      }

    } catch (error: any) {
      console.error('Company scraping error:', error);
      const errorMessage = error.message || 'Failed to scrape company data';
      setError(errorMessage);
      toast({
        title: "Scraping failed",
        description: `Failed to scrape company data: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputForm = () => (
    <div className="space-y-6">
      <div className="text-center pb-4">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Get Company Information</h3>
        <p className="text-muted-foreground">
          Enter the LinkedIn company URL to get detailed information about {companyName}.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="linkedin-url" className="block text-sm font-medium mb-2">
            LinkedIn Company URL
          </label>
          <Input
            id="linkedin-url"
            type="url"
            placeholder="https://www.linkedin.com/company/example-company/"
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
            className="w-full"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleScrapeCompany}
          disabled={isLoading || !linkedInUrl.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Information...
            </>
          ) : (
            'Get Company Information'
          )}
        </Button>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
      <h3 className="text-xl font-semibold mb-2">Analyzing Company Information</h3>
      <p className="text-muted-foreground">
        We're gathering detailed information about the company from LinkedIn...
      </p>
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
          Connecting to LinkedIn
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75"></div>
          Extracting company data
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></div>
          Processing information
        </div>
      </div>
    </div>
  );

  const renderScrapedData = () => {
    if (!scrapedData) return null;

    return (
      <div className="space-y-6">
        <div className="text-center pb-4 border-b">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
              Information Retrieved
            </Badge>
          </div>
          <Building2 className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h3 className="text-2xl font-bold">{scrapedData.name || companyName}</h3>
          {scrapedData.industry && (
            <Badge variant="secondary" className="mt-2">
              {scrapedData.industry}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scrapedData.employees_count && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Size
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-primary">
                  {typeof scrapedData.employees_count === 'number' 
                    ? scrapedData.employees_count.toLocaleString()
                    : scrapedData.employees_count
                  }
                </p>
                <p className="text-sm text-muted-foreground">Employees</p>
              </CardContent>
            </Card>
          )}

          {scrapedData.founded_year && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Founded
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-primary">{scrapedData.founded_year}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date().getFullYear() - parseInt(scrapedData.founded_year)} years ago
                </p>
              </CardContent>
            </Card>
          )}

          {(scrapedData.location || scrapedData.hq_full_address) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-semibold">
                  {scrapedData.hq_full_address || scrapedData.location}
                </p>
              </CardContent>
            </Card>
          )}

          {scrapedData.website && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <a 
                  href={scrapedData.website.startsWith('http') ? scrapedData.website : `https://${scrapedData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {scrapedData.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        {scrapedData.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Company Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {scrapedData.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social Media Links */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Social Media & Links</h4>
          <div className="flex flex-wrap gap-2">
            {scrapedData.linkedin_url && (
              <a 
                href={scrapedData.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Building2 className="h-4 w-4" />
                LinkedIn Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            
            {scrapedData.facebook_url && scrapedData.facebook_url.length > 0 && (
              <a 
                href={scrapedData.facebook_url[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                Facebook Page
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            
            {scrapedData.instagram_url && scrapedData.instagram_url.length > 0 && (
              <a 
                href={scrapedData.instagram_url[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                Instagram Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => {
              setLinkedInUrl('');
              setScrapedData(null);
              setHasScraped(false);
              setError(null);
            }}
            className="w-full"
          >
            Search Another Company
          </Button>
        </div>
      </div>
    );
  };

  const renderErrorState = () => (
    <div className="text-center py-12">
      <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <X className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Unable to Gather Information</h3>
      <p className="text-muted-foreground mb-4">
        {error || "We encountered an issue while gathering information."}
      </p>
      <Button 
        variant="outline" 
        onClick={() => {
          setError(null);
          setScrapedData(null);
          setHasScraped(false);
        }}
      >
        Try Again
      </Button>
    </div>
  );

  const getDialogContent = () => {
    if (isLoading) {
      return renderLoadingState();
    }

    if (error && !scrapedData) {
      return renderErrorState();
    }

    if (hasScraped && scrapedData) {
      return renderScrapedData();
    }

    return renderInputForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information - {companyName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {getDialogContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
