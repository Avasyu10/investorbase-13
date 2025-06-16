
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, MapPin, Globe, ExternalLink, X, CheckCircle } from "lucide-react";
import { useCompanyScraping } from "@/hooks/useCompanyScraping";
import { ScrapedCompanyData } from "@/types/company-scrape";

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
  // Use the scraping hook to get scrape data
  const { scrapeData, isLoading } = useCompanyScraping(companyId);

  const renderScrapedData = () => {
    if (!scrapeData?.scraped_data) return null;

    // Type assertion to properly type the scraped data
    const data = scrapeData.scraped_data as ScrapedCompanyData;

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="text-center pb-4 border-b">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
              Information Available
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
                  {new Date().getFullYear() - parseInt(String(data.founded_year))} years ago
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

  const renderNoDataState = () => (
    <div className="text-center py-12">
      <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-semibold mb-2">No Information Available</h3>
      <p className="text-muted-foreground">
        No additional company information has been extracted yet for {companyName}.
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <div className="h-8 w-8 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-muted-foreground">Loading company information...</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information - {companyName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading && renderLoadingState()}
          {!isLoading && scrapeData?.scraped_data && renderScrapedData()}
          {!isLoading && !scrapeData?.scraped_data && renderNoDataState()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
