
import { supabase } from "@/integrations/supabase/client";

export interface LinkedInScrapingResult {
  success: boolean;
  profiles: Array<{
    url: string;
    content: string;
  }> | null;
  error?: string;
}

export const scrapeLinkedInProfiles = async (urls: string[], companyId: string): Promise<LinkedInScrapingResult | null> => {
  if (!urls || urls.length === 0 || !urls[0].trim()) {
    return null;
  }
  
  // Filter out empty URLs and validate LinkedIn URLs
  const validUrls = urls.filter(url => {
    const trimmedUrl = url.trim();
    return trimmedUrl && (
      trimmedUrl.includes('linkedin.com/in/') || 
      trimmedUrl.includes('linkedin.com/pub/') ||
      trimmedUrl.includes('www.linkedin.com/in/') ||
      trimmedUrl.includes('www.linkedin.com/pub/')
    );
  });
  
  if (validUrls.length === 0) {
    console.log("No valid LinkedIn URLs found");
    return null;
  }
  
  try {
    console.log(`Scraping LinkedIn profiles: ${validUrls.join(', ')}`);
    
    const { data, error } = await supabase.functions.invoke('scrape-linkedin', {
      body: { linkedInUrls: validUrls, companyId }
    });
    
    if (error) {
      console.error("Error scraping LinkedIn profiles:", error);
      return {
        success: false,
        profiles: null,
        error: error.message
      };
    }
    
    if (!data.success) {
      console.error("LinkedIn profile scraping failed:", data.error);
      return {
        success: false,
        profiles: null,
        error: data.error
      };
    }
    
    console.log("LinkedIn profiles scraped successfully, profiles:", data.profiles?.length || 0);
    
    // Format the scraped content for inclusion in the report
    return {
      success: true,
      profiles: data.profiles || []
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
  
  let formattedContent = "FOUNDER LINKEDIN PROFILES ANALYSIS:\n\n";
  
  scrapingResult.profiles.forEach((profile, index) => {
    formattedContent += `=== FOUNDER ${index + 1} PROFILE ===\n`;
    formattedContent += `LinkedIn URL: ${profile.url}\n\n`;
    formattedContent += `Professional Background:\n${profile.content}\n\n`;
    formattedContent += "--- End of Profile ---\n\n";
  });
  
  formattedContent += "\nThis LinkedIn profile data should be analyzed for:\n";
  formattedContent += "- Relevant industry experience\n";
  formattedContent += "- Leadership roles and achievements\n";
  formattedContent += "- Educational background\n";
  formattedContent += "- Skills relevant to the business\n";
  formattedContent += "- Network and connections quality\n";
  formattedContent += "- Previous startup or entrepreneurial experience\n\n";
  
  return formattedContent;
};
