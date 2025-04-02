import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const CompanyDetailsPage = () => {
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
      <div className="flex flex-wrap gap-2 mt-4">
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
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Company Details Retrieval</h1>
      
      <Card className="mb-8 shadow-md">
        <CardHeader className="bg-slate-50">
          <CardTitle>Company Lookup</CardTitle>
          <CardDescription>
            Enter a LinkedIn company URL to retrieve detailed information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
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
            {isLoading ? "Processing..." : "Retrieve Company Details"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="mb-8 border-red-300 shadow-md">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-md bg-slate-200 h-12 w-64 mb-4"></div>
            <div className="rounded-md bg-slate-200 h-8 w-40"></div>
          </div>
        </div>
      )}
      
      {response && !isLoading && (
        <div className="space-y-8">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row md:items-start gap-4 bg-slate-50">
              {response.company_logo && (
                <div className="w-24 h-24 flex-shrink-0 bg-white p-2 rounded-md">
                  <img 
                    src={response.company_logo} 
                    alt={`${response.company_legal_name || 'Company'} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-grow">
                <CardTitle className="text-2xl">
                  {response.company_legal_name || 'Company Information'}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  {response.industry && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {response.industry}
                    </Badge>
                  )}
                  {response.type && (
                    <Badge variant="outline" className="border-gray-300">
                      {response.type}
                    </Badge>
                  )}
                  {response.status?.value && (
                    <Badge 
                      className={response.status.value.toLowerCase() === 'active' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}
                    >
                      {response.status.value}
                    </Badge>
                  )}
                </div>
                {renderSocialLinks()}
              </div>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full mb-6 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <TabsTrigger value="overview" className="text-center">Overview</TabsTrigger>
                  <TabsTrigger value="details" className="text-center">Details</TabsTrigger>
                  <TabsTrigger value="competitors" className="text-center">Competitors</TabsTrigger>
                  <TabsTrigger value="raw" className="text-center">Raw Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="pt-2">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-medium">About the Company</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {response.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                      {response.founded_year && (
                        <Card className="bg-slate-50">
                          <CardContent className="pt-6">
                            <h4 className="font-medium text-gray-500 mb-1">Founded</h4>
                            <p className="text-lg">{response.founded_year}</p>
                          </CardContent>
                        </Card>
                      )}
                      {response.size_range && (
                        <Card className="bg-slate-50">
                          <CardContent className="pt-6">
                            <h4 className="font-medium text-gray-500 mb-1">Company Size</h4>
                            <p className="text-lg">{response.size_range}</p>
                          </CardContent>
                        </Card>
                      )}
                      {response.hq_location && (
                        <Card className="bg-slate-50">
                          <CardContent className="pt-6">
                            <h4 className="font-medium text-gray-500 mb-1">Headquarters</h4>
                            <p className="text-lg">{response.hq_location}</p>
                          </CardContent>
                        </Card>
                      )}
                      {response.company_employee_reviews_aggregate_score && (
                        <Card className="bg-slate-50">
                          <CardContent className="pt-6">
                            <h4 className="font-medium text-gray-500 mb-1">Employee Rating</h4>
                            <p className="text-lg">{response.company_employee_reviews_aggregate_score.toFixed(1)} / 5</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {response.categories_and_keywords && response.categories_and_keywords.length > 0 && (
                      <div className="pt-4">
                        <h3 className="text-xl font-medium mb-3">Categories & Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {response.categories_and_keywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="bg-gray-100 text-gray-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="pt-2">
                  <div className="space-y-6">
                    {response.description_enriched && (
                      <div className="space-y-3">
                        <h3 className="text-xl font-medium">Enriched Description</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {response.description_enriched}
                        </p>
                      </div>
                    )}
                    
                    {response.status?.comment && (
                      <div className="space-y-3">
                        <h3 className="text-xl font-medium">Status Information</h3>
                        <Card className="bg-slate-50 p-4">
                          <p className="text-gray-700">{response.status.comment}</p>
                        </Card>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="competitors" className="pt-2">
                  <div className="space-y-6">
                    <h3 className="text-xl font-medium">Competitors</h3>
                    {response.competitors && response.competitors.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {response.competitors
                          .sort((a, b) => {
                            // Sort by similarity score in descending order, null values at the end
                            if (a.similarity_score === null) return 1;
                            if (b.similarity_score === null) return -1;
                            return b.similarity_score - a.similarity_score;
                          })
                          .map((competitor, index) => (
                            <Card key={index} className="overflow-hidden">
                              <CardContent className="p-4">
                                <p className="font-medium capitalize text-lg">
                                  {competitor.company_name}
                                </p>
                                {competitor.similarity_score !== null && (
                                  <Badge 
                                    variant="outline" 
                                    className={`mt-2 ${
                                      competitor.similarity_score > 80000 
                                        ? 'border-green-400 text-green-700' 
                                        : competitor.similarity_score > 60000 
                                        ? 'border-amber-400 text-amber-700' 
                                        : 'border-blue-400 text-blue-700'
                                    }`}
                                  >
                                    Similarity: {(competitor.similarity_score / 1000).toFixed(1)}%
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No competitor information available</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="raw" className="pt-2">
                  <div className="space-y-3">
                    <h3 className="text-xl font-medium">Raw Response Data</h3>
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <pre className="p-4 bg-slate-50 text-sm overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(response, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Full response data for debugging */}
          <Card className="mb-8 opacity-70 hover:opacity-100 transition-opacity shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle>Complete API Response</CardTitle>
              <CardDescription>
                For development and debugging purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-slate-50 text-xs overflow-x-auto">
                {JSON.stringify(fullResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CompanyDetailsPage;
