
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink, Building, Calendar, MapPin, Users, Globe, Info } from 'lucide-react';
import { useCompanyScraping } from '@/hooks/useCompanyScraping';

interface CompanyLinkedInScrapingProps {
  companyId: string;
  companyName: string;
}

export const CompanyLinkedInScraping = ({ companyId, companyName }: CompanyLinkedInScrapingProps) => {
  const { scrapeData, isLoading, scrapeMutation, hasLinkedInUrl, linkedInUrl, isScrapingInProgress } = useCompanyScraping(companyId);

  const handleScrape = () => {
    scrapeMutation.mutate();
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
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Don't render anything if there's no LinkedIn URL
  if (!hasLinkedInUrl) {
    return null;
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
            <p className="text-sm text-muted-foreground">
              Get additional company information from LinkedIn
            </p>
            
            <Button 
              onClick={handleScrape}
              disabled={isScrapingInProgress}
              className="w-full"
            >
              {isScrapingInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting More Information...
                </>
              ) : (
                <>
                  <Info className="mr-2 h-4 w-4" />
                  More Information
                </>
              )}
            </Button>
          </div>
        )}

        {scrapeData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Additional Company Information</h4>
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date(scrapeData.updated_at).toLocaleDateString()}
              </span>
            </div>

            {scrapeData.status === 'processing' && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-800">Getting more information...</span>
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
                  Failed to get additional information: {scrapeData.error_message || 'Unknown error'}
                </p>
              </div>
            )}

            {linkedInUrl && (
              <div className="pt-2 border-t">
                <a 
                  href={linkedInUrl} 
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
              onClick={handleScrape}
              disabled={isScrapingInProgress}
            >
              {isScrapingInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Information'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
