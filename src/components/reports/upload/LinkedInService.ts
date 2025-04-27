
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LinkedInScrapingResult {
  success: boolean;
  profiles: Array<{
    url: string;
    content: string;
  }> | null;
  error?: string;
}

export const scrapeLinkedInProfiles = async (urls: string[], reportId: string): Promise<LinkedInScrapingResult | null> => {
  if (!urls || urls.length === 0 || !urls[0].trim()) {
    return null;
  }
  
  // Filter out empty URLs
  const validUrls = urls.filter(url => url.trim());
  if (validUrls.length === 0) {
    return null;
  }
  
  try {
    console.log(`Scraping LinkedIn profiles: ${validUrls.join(', ')}`);
    
    // Check if token is valid first
    try {
      // Add a body to prevent empty body issues
      const { data: tokenStatus, error: tokenError } = await supabase.functions.invoke('scraped_company_details/token-check', {
        body: {}
      });
      
      if (tokenError) {
        console.error("Error checking Coresignal API key:", tokenError);
        toast({
          title: "API Key Issue",
          description: `Error checking key: ${tokenError.message}`,
          variant: "destructive"
        });
      } else if (!tokenStatus || !tokenStatus.isValid) {
        const message = tokenStatus ? tokenStatus.message : "No response from key check";
        console.error("Coresignal API key is invalid:", message);
        toast({
          title: "API Key Issue",
          description: `Coresignal API key is invalid: ${message}`,
          variant: "destructive"
        });
        
        return {
          success: false,
          profiles: null,
          error: `LinkedIn scraping failed: Invalid API key - ${message}`
        };
      } else {
        console.log("Coresignal API key is valid, proceeding with LinkedIn scraping");
      }
    } catch (tokenCheckError) {
      console.error("Error during key check:", tokenCheckError);
    }
    
    // Add timeout using Promise.race instead of AbortController
    const fetchPromise = supabase.functions.invoke('scrape-linkedin', {
      body: { linkedInUrls: validUrls, reportId }
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out after 60 seconds")), 60000);
    });
    
    // Race between the fetch and the timeout
    const { data, error } = await Promise.race([
      fetchPromise, 
      timeoutPromise.then(() => {
        throw new Error("Request timed out after 60 seconds");
      })
    ]);
    
    if (error) {
      console.error("Error scraping LinkedIn profiles:", error);
      return {
        success: false,
        profiles: null,
        error: error.message
      };
    }
    
    if (!data || !data.success) {
      const errorMessage = data?.error || "Unknown error during LinkedIn profile scraping";
      console.error("LinkedIn profile scraping failed:", errorMessage);
      return {
        success: false,
        profiles: null,
        error: errorMessage
      };
    }
    
    console.log("LinkedIn profiles scraped successfully, profiles:", data.profiles.length);
    
    // Format the scraped content for inclusion in the report
    return {
      success: true,
      profiles: data.profiles
    };
  } catch (error: any) {
    console.error("Error scraping LinkedIn profiles:", error);
    return {
      success: false,
      profiles: null,
      error: error.message || "Unknown error occurred"
    };
  }
};

export const formatLinkedInContent = (scrapingResult: LinkedInScrapingResult): string | null => {
  if (!scrapingResult.success || !scrapingResult.profiles || scrapingResult.profiles.length === 0) {
    return null;
  }
  
  return scrapingResult.profiles.map(profile => 
    `LinkedIn Profile: ${profile.url}\n${profile.content}\n\n`
  ).join('---\n\n');
};
