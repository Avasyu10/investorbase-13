
import { supabase } from "@/integrations/supabase/client";

export interface WebsiteScrapingResult {
  success: boolean;
  scrapedContent: string | null;
  error?: string;
}

export const scrapeWebsite = async (url: string): Promise<WebsiteScrapingResult | null> => {
  if (!url || !url.trim()) {
    return null;
  }
  
  // Ensure URL is properly formatted
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }
  
  try {
    console.log(`Scraping website: ${formattedUrl}`);
    
    const { data, error } = await supabase.functions.invoke('scrape-website', {
      body: { websiteUrl: formattedUrl }
    });
    
    if (error) {
      console.error("Error scraping website:", error);
      return {
        success: false,
        scrapedContent: null,
        error: error.message
      };
    }
    
    if (!data.success) {
      console.error("Website scraping failed:", data.error);
      return {
        success: false,
        scrapedContent: null,
        error: data.error
      };
    }
    
    console.log("Website scraped successfully, content length:", data.scrapedContent.length);
    
    // Store the scraped content in the database for future reference
    const { error: storeError } = await supabase
      .from('website_scrapes')
      .insert({
        url: formattedUrl,
        content: data.scrapedContent,
        scraped_at: new Date().toISOString()
      });
    
    if (storeError) {
      console.error("Error storing scraped content:", storeError);
    }
    
    return {
      success: true,
      scrapedContent: data.scrapedContent
    };
  } catch (error: any) {
    console.error("Error scraping website:", error);
    return {
      success: false,
      scrapedContent: null,
      error: error.message || "Unknown error occurred"
    };
  }
};
