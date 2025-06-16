
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Building, Calendar, MapPin, Users, Globe } from 'lucide-react';
import { useCompanyScraping } from '@/hooks/useCompanyScraping';

interface CompanyLinkedInScrapingProps {
  companyId: string;
  companyName: string;
}

export const CompanyLinkedInScraping = ({ companyId, companyName }: CompanyLinkedInScrapingProps) => {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const { scrapeData, isLoading, scrapeMutation, isScrapingInProgress } = useCompanyScraping(companyId);

  const handleScrape = () => {
    if (!linkedInUrl.trim()) {
      return;
    }

    // Validate LinkedIn URL format
    if (!linkedInUrl.includes('linkedin.com/company/')) {
      return;
    }

    scrapeMutation.mutate({ linkedInUrl });
  };

  const formatScrapedData = (data: any) => {
    if (!data) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.name && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Name:</span>
              <span>{data.name}</span>
            </div>
          )}
          
          {data.industry && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Industry:</span>
              <span>{data.industry}</span>
            </div>
          )}
          
          {data.employees_count && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Employees:</span>
              <span>{data.employees_count}</span>
            </div>
          )}
          
          {data.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span>{data.location}</span>
            </div>
          )}
          
          {data.founded_year && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Founded:</span>
              <span>{data.founded_year}</span>
            </div>
          )}
          
          {data.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Website:</span>
              <a 
                href={data.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {data.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
        
        {data.description && (
          <div className="mt-4">
            <span className="font-medium">Description:</span>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading company data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Company LinkedIn Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!scrapeData && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">Company LinkedIn URL</Label>
              <Input
                id="linkedin-url"
                placeholder="https://linkedin.com/company/your-company-name"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                disabled={isScrapingInProgress}
              />
              <p className="text-sm text-muted-foreground">
                Enter the company's LinkedIn page URL to extract additional information
              </p>
            </div>
            
            <Button 
              onClick={handleScrape}
              disabled={!linkedInUrl.trim() || !linkedInUrl.includes('linkedin.com/company/') || isScrapingInProgress}
              className="w-full"
            >
              {isScrapingInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Company Data...
                </>
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" />
                  Extract Company Information
                </>
              )}
            </Button>
          </div>
        )}

        {scrapeData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Scraped Company Information</h4>
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date(scrapeData.updated_at).toLocaleDateString()}
              </span>
            </div>

            {scrapeData.status === 'processing' && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-800">Processing company data...</span>
              </div>
            )}

            {scrapeData.status === 'completed' && scrapeData.scraped_data && (
              <div className="p-4 bg-green-50 rounded-lg">
                {formatScrapedData(scrapeData.scraped_data)}
              </div>
            )}

            {scrapeData.status === 'failed' && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-800">
                  Failed to extract company data: {scrapeData.error_message || 'Unknown error'}
                </p>
              </div>
            )}

            {scrapeData.linkedin_url && (
              <div className="pt-2 border-t">
                <a 
                  href={scrapeData.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                >
                  <ExternalLink className="h-3 w-3" />
                  View LinkedIn Page
                </a>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setLinkedInUrl(scrapeData.linkedin_url);
                scrapeMutation.mutate({ linkedInUrl: scrapeData.linkedin_url });
              }}
              disabled={isScrapingInProgress}
            >
              {isScrapingInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-extracting...
                </>
              ) : (
                'Re-extract Data'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
