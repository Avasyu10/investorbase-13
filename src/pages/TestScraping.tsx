
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Facebook, Globe, Info, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

// Define a type for the company data with only the fields we want
type CompanyData = {
  company_legal_name?: string;
  website?: string;
  linkedin_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  crunchbase_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  company_logo?: string;
  description?: string;
  description_enriched?: string;
  industry?: string;
  categories_and_keywords?: string[];
  type?: string;
  status?: {
    value?: string;
    comment?: string;
  };
  founded_year?: string;
  size_range?: string;
  hq_location?: string;
  competitors?: Array<{
    company_name: string;
    similarity_score: number | null;
  }>;
  company_employee_reviews_aggregate_score?: number;
};

const TestScraping = () => {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullResponse, setFullResponse] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkedInUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a LinkedIn company URL",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResponse(null);
      setFullResponse(null);
      
      console.log("Sending request to scraped_company_details function with URL:", linkedInUrl);
      
      const { data, error } = await supabase.functions.invoke('scraped_company_details', {
        body: { linkedInUrl }
      });
      
      if (error) {
        console.error("Function error:", error);
        setError(error.message || "An error occurred while calling the function");
        toast({
          title: "Error",
          description: error.message || "Failed to scrape company details",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Function response:", data);
      
      if (data.error) {
        setError(data.error);
        toast({
          title: "API Error",
          description: data.error,
          variant: "destructive"
        });
        return;
      }
      
      // Store the full response for debugging
      setFullResponse(data);
      
      // Extract only the fields we need
      if (data.companyData) {
        const extractedData: CompanyData = {
          company_legal_name: data.companyData.company_legal_name,
          website: data.companyData.website,
          linkedin_url: data.companyData.linkedin_url,
          facebook_url: data.companyData.facebook_url,
          twitter_url: data.companyData.twitter_url,
          crunchbase_url: data.companyData.crunchbase_url,
          instagram_url: data.companyData.instagram_url,
          youtube_url: data.companyData.youtube_url,
          company_logo: data.companyData.company_logo,
          description: data.companyData.description,
          description_enriched: data.companyData.description_enriched,
          industry: data.companyData.industry,
          categories_and_keywords: data.companyData.categories_and_keywords,
          type: data.companyData.type,
          status: data.companyData.status,
          founded_year: data.companyData.founded_year,
          size_range: data.companyData.size_range,
          hq_location: data.companyData.hq_location,
          competitors: data.companyData.competitors,
          company_employee_reviews_aggregate_score: data.companyData.company_employee_reviews_aggregate_score
        };
        
        setResponse(extractedData);
      }
      
      toast({
        title: "Success",
        description: "Company details scraped successfully",
      });
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError(err.message || "An unexpected error occurred");
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSocialLinks = () => {
    if (!response) return null;
    
    return (
      <div className="flex space-x-2 mt-4 flex-wrap">
        {response.website && (
          <a href={response.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Globe size={16} className="mr-1" /> Website
            </Button>
          </a>
        )}
        {response.linkedin_url && (
          <a href={response.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Linkedin size={16} className="mr-1" /> LinkedIn
            </Button>
          </a>
        )}
        {response.facebook_url && (
          <a href={response.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Facebook size={16} className="mr-1" /> Facebook
            </Button>
          </a>
        )}
        {response.twitter_url && (
          <a href={response.twitter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Twitter size={16} className="mr-1" /> Twitter
            </Button>
          </a>
        )}
        {response.instagram_url && (
          <a href={response.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Instagram size={16} className="mr-1" /> Instagram
            </Button>
          </a>
        )}
        {response.youtube_url && (
          <a href={response.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Youtube size={16} className="mr-1" /> YouTube
            </Button>
          </a>
        )}
        {response.crunchbase_url && (
          <a href={response.crunchbase_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
            <Button variant="outline" size="sm">
              <Info size={16} className="mr-1" /> Crunchbase
            </Button>
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test Company Scraping</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Scrape Company Details</CardTitle>
          <CardDescription>
            Enter a LinkedIn company URL to scrape details using the Coresignal API
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="linkedInUrl" className="font-medium">LinkedIn Company URL</label>
              <Input
                id="linkedInUrl"
                type="text"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                placeholder="https://www.linkedin.com/company/example-company"
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                Example: https://www.linkedin.com/company/apple
              </p>
            </div>
          </form>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Processing..." : "Scrape Company Details"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="mb-8 border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {response && (
        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader className="flex flex-row items-start gap-4">
                {response.company_logo && (
                  <div className="w-24 h-24 flex-shrink-0">
                    <img 
                      src={response.company_logo} 
                      alt={`${response.company_legal_name || 'Company'} logo`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <CardTitle>{response.company_legal_name || 'Company Information'}</CardTitle>
                  <div className="mt-2 space-y-1">
                    {response.industry && (
                      <Badge variant="secondary" className="mr-2">
                        {response.industry}
                      </Badge>
                    )}
                    {response.type && (
                      <Badge variant="outline" className="mr-2">
                        {response.type}
                      </Badge>
                    )}
                    {response.status?.value && (
                      <Badge 
                        variant={response.status.value.toLowerCase() === 'active' ? 'green' : 'blue'} 
                        className="mr-2"
                      >
                        {response.status.value}
                      </Badge>
                    )}
                  </div>
                  {renderSocialLinks()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="text-gray-700">{response.description || 'No description available'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {response.founded_year && (
                    <div>
                      <h4 className="font-medium">Founded</h4>
                      <p>{response.founded_year}</p>
                    </div>
                  )}
                  {response.size_range && (
                    <div>
                      <h4 className="font-medium">Company Size</h4>
                      <p>{response.size_range}</p>
                    </div>
                  )}
                  {response.hq_location && (
                    <div>
                      <h4 className="font-medium">Headquarters</h4>
                      <p>{response.hq_location}</p>
                    </div>
                  )}
                  {response.company_employee_reviews_aggregate_score && (
                    <div>
                      <h4 className="font-medium">Employee Rating</h4>
                      <p>{response.company_employee_reviews_aggregate_score.toFixed(1)} / 5</p>
                    </div>
                  )}
                </div>
                
                {response.categories_and_keywords && response.categories_and_keywords.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Categories & Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {response.categories_and_keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {response.description_enriched && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Enriched Description</h3>
                    <p className="text-gray-700">{response.description_enriched}</p>
                  </div>
                )}
                
                {response.status?.comment && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Status Comment</h3>
                    <p className="text-gray-700">{response.status.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="competitors">
            <Card>
              <CardHeader>
                <CardTitle>Competitors</CardTitle>
                <CardDescription>
                  Companies in the same industry or market space
                </CardDescription>
              </CardHeader>
              <CardContent>
                {response.competitors && response.competitors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {response.competitors.map((competitor, index) => (
                      <Card key={index} className="border p-4">
                        <p className="font-medium capitalize">
                          {competitor.company_name}
                        </p>
                        {competitor.similarity_score !== null && (
                          <Badge variant="outline" className="mt-2">
                            Similarity: {(competitor.similarity_score / 1000).toFixed(2)}%
                          </Badge>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No competitor information available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw Response Data</CardTitle>
                <CardDescription>
                  Extracted fields from the API response
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={JSON.stringify(response, null, 2)}
                  readOnly
                  className="min-h-[300px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Full response data for debugging */}
      {fullResponse && (
        <Card className="mb-8 opacity-50 hover:opacity-100 transition-opacity">
          <CardHeader>
            <CardTitle>Full API Response</CardTitle>
            <CardDescription>
              Complete data returned by the API (for debugging)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(fullResponse, null, 2)}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestScraping;
