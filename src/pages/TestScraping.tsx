
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Facebook, Twitter, Linkedin, Instagram, Youtube, Globe, Info, Users, MapPin, Briefcase, Award, TrendingUp } from 'lucide-react';

const TestScraping = () => {
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      
      setResponse(data);
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

  // Helper function to render social media links
  const renderSocialLinks = (companyData: any) => {
    const links = [];
    
    if (companyData.linkedin_url) {
      links.push({ icon: <Linkedin className="h-5 w-5" />, url: companyData.linkedin_url, name: 'LinkedIn' });
    }
    
    if (companyData.facebook_url) {
      links.push({ icon: <Facebook className="h-5 w-5" />, url: companyData.facebook_url, name: 'Facebook' });
    }
    
    if (companyData.twitter_url) {
      links.push({ icon: <Twitter className="h-5 w-5" />, url: companyData.twitter_url, name: 'Twitter' });
    }
    
    if (companyData.instagram_url) {
      links.push({ icon: <Instagram className="h-5 w-5" />, url: companyData.instagram_url, name: 'Instagram' });
    }
    
    if (companyData.youtube_url) {
      links.push({ icon: <Youtube className="h-5 w-5" />, url: companyData.youtube_url, name: 'YouTube' });
    }
    
    if (companyData.website) {
      links.push({ icon: <Globe className="h-5 w-5" />, url: companyData.website, name: 'Website' });
    }
    
    if (companyData.crunchbase_url) {
      links.push({ icon: <Info className="h-5 w-5" />, url: companyData.crunchbase_url, name: 'Crunchbase' });
    }
    
    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {links.map((link, index) => (
          <a 
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            {link.icon}
            <span>{link.name}</span>
          </a>
        ))}
      </div>
    );
  };

  // Helper function to render competitors
  const renderCompetitors = (competitors: any[]) => {
    if (!competitors || !competitors.length) {
      return <p>No competitor information available</p>;
    }

    // Sort competitors by similarity score (if available)
    const sortedCompetitors = [...competitors].sort((a, b) => {
      if (a.similarity_score && b.similarity_score) {
        return b.similarity_score - a.similarity_score;
      }
      if (a.similarity_score) return -1;
      if (b.similarity_score) return 1;
      return 0;
    });

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {sortedCompetitors.map((competitor, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium capitalize">{competitor.company_name}</div>
            {competitor.similarity_score && (
              <div className="text-sm text-gray-500">
                Similarity: {Math.round((competitor.similarity_score / 100000) * 100)}%
              </div>
            )}
          </div>
        ))}
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
      
      {response && response.companyData && (
        <div className="space-y-6">
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {response.companyData.company_logo && (
                    <img 
                      src={response.companyData.company_logo} 
                      alt={`${response.companyData.company_legal_name || 'Company'} logo`}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <CardTitle className="text-2xl">
                      {response.companyData.company_legal_name || 'Company Details'}
                    </CardTitle>
                    {response.companyData.industry && (
                      <Badge className="mt-1">{response.companyData.industry}</Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {response.companyData.type && (
                    <div className="mb-1 text-sm font-medium">{response.companyData.type}</div>
                  )}
                  {response.companyData.status && (
                    <Badge variant={response.companyData.status.value === "active" ? "default" : "outline"}>
                      {response.companyData.status.value}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Company Details</TabsTrigger>
                  <TabsTrigger value="competitors">Competitors</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {response.companyData.description && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{response.companyData.description}</p>
                    </div>
                  )}
                  
                  {renderSocialLinks(response.companyData)}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {response.companyData.founded_year && (
                      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                        <Award className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">Founded</div>
                          <div className="font-medium">{response.companyData.founded_year}</div>
                        </div>
                      </div>
                    )}
                    
                    {response.companyData.size_range && (
                      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">Company Size</div>
                          <div className="font-medium">{response.companyData.size_range}</div>
                        </div>
                      </div>
                    )}
                    
                    {response.companyData.hq_location && (
                      <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-500">Headquarters</div>
                          <div className="font-medium">{response.companyData.hq_location}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-6">
                  {response.companyData.description_enriched && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Enriched Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{response.companyData.description_enriched}</p>
                    </div>
                  )}
                  
                  {response.companyData.categories_and_keywords && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Categories & Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {typeof response.companyData.categories_and_keywords === 'string' 
                          ? response.companyData.categories_and_keywords.split(',').map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline">{keyword.trim()}</Badge>
                            ))
                          : Array.isArray(response.companyData.categories_and_keywords)
                            ? response.companyData.categories_and_keywords.map((keyword: string, idx: number) => (
                                <Badge key={idx} variant="outline">{keyword.trim()}</Badge>
                              ))
                            : <p>No categories available</p>
                        }
                      </div>
                    </div>
                  )}
                  
                  {response.companyData.company_employee_reviews_aggregate_score !== undefined && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Employee Review Score</h3>
                      <div className="font-medium text-lg">
                        {response.companyData.company_employee_reviews_aggregate_score} 
                        <span className="text-sm text-gray-500 ml-2">/ 5</span>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="competitors">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Competitors</h3>
                    {response.companyData.competitors 
                      ? renderCompetitors(response.companyData.competitors)
                      : <p>No competitor data available</p>
                    }
                  </div>
                </TabsContent>
                
                <TabsContent value="raw">
                  <Textarea
                    value={JSON.stringify(response, null, 2)}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TestScraping;
