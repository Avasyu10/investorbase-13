
import { supabase } from "@/integrations/supabase/client";

export interface LinkedInScrapingResult {
  success: boolean;
  profiles: Array<{
    url: string;
    content: string;
  }> | null;
  error?: string;
  debugInfo?: any;
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
    console.log(`=========== LINKEDIN SCRAPING DEBUG INFO ===========`);
    console.log(`[${new Date().toISOString()}] Scraping LinkedIn profiles: ${validUrls.join(', ')}`);
    console.log(`Report ID: ${reportId}`);
    
    // Create debug info collection
    const debugInfo: any[] = [];
    
    // Log the request details
    const requestInfo = {
      timestamp: new Date().toISOString(),
      event: "Function call initiated",
      function: "scrape-linkedin",
      parameters: {
        linkedInUrls: validUrls,
        reportId
      }
    };
    console.log(`[${requestInfo.timestamp}] Request info:`, requestInfo);
    debugInfo.push(requestInfo);
    
    const startTime = Date.now();
    
    // Make the function call
    console.log(`[${new Date().toISOString()}] Making Supabase function call to scrape-linkedin`);
    const { data, error } = await supabase.functions.invoke('scrape-linkedin', {
      body: { linkedInUrls: validUrls, reportId }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log the response
    const responseInfo = {
      timestamp: new Date().toISOString(),
      event: "Function response received",
      duration: `${duration}ms`,
      success: !error && data?.success,
      error: error?.message || data?.error || null,
      dataPreview: data ? {
        success: data.success,
        profilesCount: data.profiles?.length || 0
      } : null
    };
    console.log(`[${responseInfo.timestamp}] Function call completed in ${duration}ms`);
    console.log(`Response info:`, responseInfo);
    debugInfo.push(responseInfo);
    
    if (error) {
      console.error(`[${new Date().toISOString()}] Error scraping LinkedIn profiles:`, error);
      debugInfo.push({
        timestamp: new Date().toISOString(),
        event: "Error in function call",
        error: error
      });
      
      console.log(`=========== END LINKEDIN SCRAPING DEBUG INFO ===========`);
      return {
        success: false,
        profiles: null,
        error: error.message,
        debugInfo
      };
    }
    
    if (!data.success) {
      console.error(`[${new Date().toISOString()}] LinkedIn profile scraping failed:`, data.error);
      debugInfo.push({
        timestamp: new Date().toISOString(),
        event: "API reported failure",
        error: data.error
      });
      
      console.log(`=========== END LINKEDIN SCRAPING DEBUG INFO ===========`);
      return {
        success: false,
        profiles: null,
        error: data.error,
        debugInfo
      };
    }
    
    console.log(`[${new Date().toISOString()}] LinkedIn profiles scraped successfully, profiles:`, data.profiles.length);
    debugInfo.push({
      timestamp: new Date().toISOString(),
      event: "Scraping successful",
      profilesCount: data.profiles.length
    });
    
    console.log(`=========== END LINKEDIN SCRAPING DEBUG INFO ===========`);
    
    // Format the scraped content for inclusion in the report
    return {
      success: true,
      profiles: data.profiles,
      debugInfo
    };
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error scraping LinkedIn profiles:`, error);
    console.log(`=========== END LINKEDIN SCRAPING DEBUG INFO ===========`);
    return {
      success: false,
      profiles: null,
      error: error.message || "Unknown error occurred",
      debugInfo: [{
        timestamp: new Date().toISOString(),
        event: "Exception caught",
        error: error.message || String(error),
        stack: error.stack
      }]
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
