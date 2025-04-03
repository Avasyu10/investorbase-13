
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Facebook, Globe, Info, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

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

const CompanyDetailPage = () => {
  const navigate = useNavigate();
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      setIsSubmitted(true);
      
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

  const handleBackClick = () => {
    navigate(-1); // Navigate back to the previous page
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
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackClick}
        className="mb-6 flex items-center"
      >
        <ChevronLeft className="mr-1" /> Back to Company
      </Button>
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 tracking-tight text-gold">Company Intelligence</h1>
        
        {!response && (
          <Card className="mb-8 shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-gold">Research Company</CardTitle>
              <CardDescription>Enter a LinkedIn company URL to retrieve detailed information</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="linkedInUrl" className="font-medium">Company LinkedIn URL</label>
                  <Input
                    id="linkedInUrl"
                    type="text"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/company/company-name"
                    className="w-full"
                  />
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
                {isLoading ? "Processing..." : "Fetch Company Details"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {isSubmitted && (
        <>
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-lg">Loading company information...</p>
            </div>
          )}
          
          {error && !isLoading && (
            <Card className="mb-8 border-red-300 max-w-3xl mx-auto">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
          
          {response && !isLoading && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <Card className="shadow-md border-0">
                <CardHeader className="flex flex-col sm:flex-row items-start gap-4 pb-2">
                  {response.company_logo && (
                    <div className="w-24 h-24 flex-shrink-0 bg-white p-2 rounded-md shadow-sm">
                      <img 
                        src={response.company_logo} 
                        alt={`${response.company_legal_name || 'Company'} logo`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-2xl text-gold">{response.company_legal_name || 'Company Information'}</CardTitle>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {response.industry && (
                        <Badge variant="secondary">
                          {response.industry}
                        </Badge>
                      )}
                      {response.type && (
                        <Badge variant="outline">
                          {response.type}
                        </Badge>
                      )}
                      {response.status?.value && (
                        <Badge 
                          variant={response.status.value.toLowerCase() === 'active' ? 'default' : 'secondary'} 
                        >
                          {response.status.value}
                        </Badge>
                      )}
                    </div>
                    
                    {renderSocialLinks()}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-4">
                  {response.description && (
                    <div className="py-2">
                      <h3 className="text-lg font-medium mb-2 text-gold">Description</h3>
                      <p className="text-foreground whitespace-pre-line">{response.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 border-t pt-6">
                    {response.founded_year && (
                      <div>
                        <h4 className="font-medium text-sm text-gold">Founded</h4>
                        <p className="text-foreground">{response.founded_year}</p>
                      </div>
                    )}
                    {response.size_range && (
                      <div>
                        <h4 className="font-medium text-sm text-gold">Company Size</h4>
                        <p className="text-foreground">{response.size_range}</p>
                      </div>
                    )}
                    {response.hq_location && (
                      <div>
                        <h4 className="font-medium text-sm text-gold">Headquarters</h4>
                        <p className="text-foreground">{response.hq_location}</p>
                      </div>
                    )}
                    {response.company_employee_reviews_aggregate_score !== undefined && (
                      <div>
                        <h4 className="font-medium text-sm text-gold">Employee Rating</h4>
                        <p className="text-foreground">{response.company_employee_reviews_aggregate_score.toFixed(1)} / 5</p>
                      </div>
                    )}
                  </div>
                  
                  {response.categories_and_keywords && response.categories_and_keywords.length > 0 && (
                    <div className="mt-6 border-t pt-6">
                      <h3 className="text-lg font-medium mb-3 text-gold">Categories & Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {response.categories_and_keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Tabs defaultValue="details" className="mt-8">
                <TabsList className="mb-4 w-full flex max-w-md mx-auto">
                  <TabsTrigger value="details" className="flex-1">Detailed Info</TabsTrigger>
                  <TabsTrigger value="competitors" className="flex-1">Competitors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-gold">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {response.description_enriched && (
                        <div>
                          <h3 className="text-lg font-medium mb-2 text-gold">Enriched Description</h3>
                          <p className="text-foreground whitespace-pre-line">{response.description_enriched}</p>
                        </div>
                      )}
                      
                      {response.status?.comment && (
                        <div>
                          <h3 className="text-lg font-medium mb-2 text-gold">Status Comment</h3>
                          <p className="text-foreground">{response.status.comment}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="competitors">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-gold">Competitors</CardTitle>
                      <CardDescription>
                        Companies in the same industry or market space
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {response.competitors && response.competitors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {response.competitors.map((competitor, index) => (
                            <Card key={index} className="border p-4 h-full">
                              <p className="font-medium capitalize text-foreground">
                                {competitor.company_name}
                              </p>
                              {competitor.similarity_score !== null && (
                                <Badge variant="outline" className="mt-2">
                                  Similarity: {((competitor.similarity_score || 0) / 1000).toFixed(2)}%
                                </Badge>
                              )}
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4">No competitor information available</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompanyDetailPage;
