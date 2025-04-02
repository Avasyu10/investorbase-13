
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(response, null, 2)}
              readOnly
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestScraping;
