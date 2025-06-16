
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Calendar, MapPin, Globe, ExternalLink, X, CheckCircle } from "lucide-react";
import { useCompanyScraping } from "@/hooks/useCompanyScraping";
import { toast } from "@/hooks/use-toast";

interface CompanyScrapingDialogProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyScrapingDialog({ 
  companyId, 
  companyName, 
  open, 
  onOpenChange 
}: CompanyScrapingDialogProps) {
  const { scrapeData, scrapeMutation, hasLinkedInUrl, isScrapingInProgress } = useCompanyScraping(companyId);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Show success toast when scraping completes
  useEffect(() => {
    if (scrapeData?.status === 'completed' && previousStatus === 'processing') {
      toast({
        title: "Information Retrieved",
        description: "Company information has been successfully extracted from LinkedIn.",
      });
    }
    setPreviousStatus(scrapeData?.status || null);
  }, [scrapeData?.status, previousStatus]);

  const handleStartScraping = () => {
    console.log("Starting scraping process for company:", companyId);
    if (hasLinkedInUrl) {
      scrapeMutation.mutate();
    }
  };

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
      <h3 className="text-xl font-semibold mb-2">Analyzing Company Information</h3>
      <p className="text-muted-foreground">
        We're gathering detailed information about {companyName} from LinkedIn...
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
    if (!scrapeData?.scraped_data) return null;

    const data = scrapeData.scraped_data;

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
          <h3 className="text-2xl font-bold">{data.name || companyName}</h3>
          {data.industry && (
            <Badge variant="secondary" className="mt-2">
              {data.industry}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.employees_count && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Size
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-primary">
                  {typeof data.employees_count === 'number' 
                    ? data.employees_count.toLocaleString()
                    : data.employees_count
                  }
                </p>
                <p className="text-sm text-muted-foreground">Employees</p>
              </CardContent>
            </Card>
          )}

          {data.founded_year && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Founded
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-2xl font-bold text-primary">{data.founded_year}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date().getFullYear() - parseInt(data.founded_year)} years ago
                </p>
              </CardContent>
            </Card>
          )}

          {data.location && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-semibold">{data.location}</p>
              </CardContent>
            </Card>
          )}

          {data.website && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <a 
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {data.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        {data.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Company Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.description}
              </p>
            </CardContent>
          </Card>
        )}

        {data.linkedin_url && (
          <div className="pt-4 border-t">
            <a 
              href={data.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Building2 className="h-4 w-4" />
              View LinkedIn Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderInitialState = () => (
    <div className="text-center py-12">
      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-semibold mb-2">Get Detailed Company Information</h3>
      <p className="text-muted-foreground mb-6">
        Click the button below to gather additional information about {companyName} from LinkedIn.
      </p>
      <Button 
        onClick={handleStartScraping}
        disabled={isScrapingInProgress || !hasLinkedInUrl}
        className="min-w-[120px]"
      >
        {isScrapingInProgress ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          'Get Information'
        )}
      </Button>
      {!hasLinkedInUrl && (
        <p className="text-sm text-muted-foreground mt-4">
          No LinkedIn URL available for this company.
        </p>
      )}
    </div>
  );

  const renderNoDataState = () => (
    <div className="text-center py-12">
      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-semibold mb-2">No LinkedIn URL Available</h3>
      <p className="text-muted-foreground">
        We need a LinkedIn company URL to gather additional information about {companyName}.
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-12">
      <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <X className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Unable to Gather Information</h3>
      <p className="text-muted-foreground mb-4">
        We encountered an issue while gathering information about {companyName}.
      </p>
      <Button 
        variant="outline" 
        onClick={handleStartScraping}
        disabled={isScrapingInProgress}
      >
        Try Again
      </Button>
    </div>
  );

  // Determine what content to show based on current state
  const getDialogContent = () => {
    console.log("Dialog state check:", {
      hasLinkedInUrl,
      scrapeData: scrapeData?.status,
      isScrapingInProgress,
      hasScrapeData: !!scrapeData
    });

    // No LinkedIn URL available
    if (!hasLinkedInUrl) {
      return renderNoDataState();
    }

    // Currently scraping
    if (isScrapingInProgress) {
      return renderLoadingState();
    }

    // Scraping completed successfully
    if (scrapeData?.status === 'completed') {
      return renderScrapedData();
    }

    // Scraping failed
    if (scrapeData?.status === 'failed') {
      return renderErrorState();
    }

    // Initial state - no scraping has been done yet
    return renderInitialState();
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
