import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  company_employee_reviews_aggregate_score?: number | null;
};

const CompanyDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);

  // Reset state when ID changes
  useEffect(() => {
    setResponse(null);
    setIsSubmitted(false);
    setLinkedInUrl('');
  }, [id]);

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
      setDebugInfo([]);
      
      // Debug info for the console
      console.log("=========== COMPANY DETAILS DEBUG INFO ===========");
      console.log(`[${new Date().toISOString()}] Starting API request`);
      console.log(`LinkedIn URL: ${linkedInUrl}`);
      console.log("Sending request to scraped_company_details function");
      
      let debugLogs = [{
        timestamp: new Date().toISOString(),
        event: "Request started",
        data: { linkedInUrl }
      }];
      
      // Create a custom fetch function with detailed logging
      const fetchWithLogging = async () => {
        const startTime = Date.now();
        debugLogs.push({
          timestamp: new Date().toISOString(),
          event: "Initiating function call",
          data: { 
            function: 'scraped_company_details',
            body: { linkedInUrl }
          }
        });
        
        console.log(`[${new Date().toISOString()}] Creating function request with body:`, { linkedInUrl });
        
        // First log the request details that will be sent
        let reqConfig;
        try {
          // Get the request config that supabase will use
          const { data: configData, error: configError } = await supabase.functions.invoke('scraped_company_details', {
            body: { linkedInUrl },
            __method: 'HEAD' // This is a hack to get the config without actually making the request
          });
          
          reqConfig = configData;
          console.log(`[${new Date().toISOString()}] Request configuration:`, reqConfig);
          debugLogs.push({
            timestamp: new Date().toISOString(),
            event: "Request configuration obtained",
            data: reqConfig
          });
        } catch (configErr) {
          console.log(`[${new Date().toISOString()}] Could not get request config:`, configErr);
        }
        
        // Now make the actual request
        console.log(`[${new Date().toISOString()}] Sending request to scraped_company_details function with URL:`, linkedInUrl);
        
        try {
          // Create a direct fetch to log raw request/response
          const supabaseUrl = "https://jhtnruktmtjqrfoiyrep.supabase.co";
          const endpoint = `${supabaseUrl}/functions/v1/scraped_company_details`;
          
          console.log(`[${new Date().toISOString()}] Direct API call to: ${endpoint}`);
          debugLogs.push({
            timestamp: new Date().toISOString(),
            event: "Direct API call initiated",
            data: { 
              url: endpoint,
              method: 'POST',
              body: { linkedInUrl }
            }
          });
          
          // Make the official supabase function call
          const { data, error } = await supabase.functions.invoke('scraped_company_details', {
            body: { linkedInUrl }
          });
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.log(`[${new Date().toISOString()}] Function call completed in ${duration}ms`);
          console.log(`[${new Date().toISOString()}] Response data:`, data);
          console.log(`[${new Date().toISOString()}] Response error:`, error);
          
          debugLogs.push({
            timestamp: new Date().toISOString(),
            event: "Response received",
            duration: `${duration}ms`,
            data: data,
            error: error
          });
          
          return { data, error };
        } catch (fetchErr) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          console.error(`[${new Date().toISOString()}] Fetch error after ${duration}ms:`, fetchErr);
          debugLogs.push({
            timestamp: new Date().toISOString(),
            event: "Fetch error",
            duration: `${duration}ms`,
            error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
          });
          
          throw fetchErr;
        }
      };
      
      const { data, error } = await fetchWithLogging();
      
      if (error) {
        console.error(`[${new Date().toISOString()}] Function error:`, error);
        debugLogs.push({
          timestamp: new Date().toISOString(),
          event: "Function error",
          error: error
        });
        
        setError(error.message || "An error occurred while calling the function");
        toast({
          title: "Error",
          description: error.message || "Failed to fetch company details",
          variant: "destructive"
        });
        setDebugInfo(debugLogs);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] Function response:`, data);
      debugLogs.push({
        timestamp: new Date().toISOString(),
        event: "Function success",
        data: data
      });
      
      if (data.error) {
        console.error(`[${new Date().toISOString()}] API Error:`, data.error);
        debugLogs.push({
          timestamp: new Date().toISOString(),
          event: "API error",
          error: data.error
        });
        
        setError(data.error);
        toast({
          title: "API Error",
          description: data.error,
          variant: "destructive"
        });
        setDebugInfo(debugLogs);
        return;
      }
      
      // Store the full response for debugging
      setFullResponse(data);
      debugLogs.push({
        timestamp: new Date().toISOString(),
        event: "Data processed",
        processedData: "Full response stored for debugging"
      });
      
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
        debugLogs.push({
          timestamp: new Date().toISOString(),
          event: "Data extracted",
          extractedData: extractedData
        });
      }
      
      console.log(`[${new Date().toISOString()}] Request completed successfully`);
      console.log("=========== END DEBUG INFO ===========");
      
      toast({
        title: "Success",
        description: "Company details fetched successfully",
      });
      
      setDebugInfo(debugLogs);
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] Unexpected error:`, err);
      const debugLog = {
        timestamp: new Date().toISOString(),
        event: "Unexpected error",
        error: err.message || "Unknown error"
      };
      
      setDebugInfo(prevLogs => [...prevLogs, debugLog]);
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

  // Debug info display for development
  const renderDebugInfo = () => {
    if (debugInfo.length === 0) return null;
    
    return (
      <div className="mt-8 p-4 bg-gray-100 rounded-md overflow-auto max-h-96 text-xs">
        <h3 className="font-bold mb-2 text-lg">Debug Information</h3>
        {debugInfo.map((log, index) => (
          <div key={index} className="mb-2 border-b pb-1">
            <div className="flex justify-between">
              <span className="font-mono text-blue-600">{log.timestamp}</span>
              <span className="font-semibold">{log.event}</span>
            </div>
            <pre className="mt-1 whitespace-pre-wrap">
              {JSON.stringify(log.data || log.error || {}, null, 2)}
            </pre>
          </div>
        ))}
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
        
        {!response && (
          <Card className="mb-8 shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-gold"> Company Information </CardTitle>
              <CardDescription>Please confirm the Company LinkedIn Profile to retrieve detailed information</CardDescription>
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
                {isLoading ? "Processing..." : "Get Company Details"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {isSubmitted && (
        <>
          {/* Debug button to show console logs */}
          <Button
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log("=========== MANUAL DEBUG INFO DUMP ===========");
              console.log("Debug info:", debugInfo);
              console.log("Full response:", fullResponse);
              console.log("Error state:", error);
              console.log("LinkedIn URL:", linkedInUrl);
              console.log("Is loading:", isLoading);
              console.log("=========== END MANUAL DEBUG INFO DUMP ===========");
              toast({
                title: "Debug Info",
                description: "Debug information has been logged to console",
              });
            }}
            className="mb-4"
          >
            Dump Debug Info to Console
          </Button>
          
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
                {renderDebugInfo()}
              </CardContent>
            </Card>
          )}
          
          {response && !isLoading && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <Card className="shadow-md border-0">
                <CardHeader className="flex flex-col sm:flex-row items-start gap-4 pb-2">
                  {response.company_logo ? (
                    <div className="w-24 h-24 flex-shrink-0 bg-white p-2 rounded-md shadow-sm">
                      <Avatar className="w-full h-full">
                        <AvatarImage 
                          src={response.company_logo} 
                          alt={`${response.company_legal_name || 'Company'} logo`}
                          className="object-contain"
                        />
                        <AvatarFallback>{response.company_legal_name?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="w-24 h-24 flex-shrink-0 bg-white p-2 rounded-md shadow-sm flex items-center justify-center">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback>{response.company_legal_name?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
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
                    {response.company_employee_reviews_aggregate_score !== undefined && response.company_employee_reviews_aggregate_score !== null && (
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
                  <TabsTrigger value="debug" className="flex-1">Debug</TabsTrigger>
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
                
                <TabsContent value="debug">
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-gold">Debug Information</CardTitle>
                      <CardDescription>
                        Technical details about the API request and response
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderDebugInfo()}
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
