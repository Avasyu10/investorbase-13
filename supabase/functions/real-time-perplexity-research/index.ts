
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

type NewsHighlight = {
  headline: string;
  content: string;
  source?: string;
  url?: string;
};

type MarketInsight = {
  headline: string;
  content: string;
  source?: string;
  url?: string;
};

type Source = {
  name: string;
  url: string;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log("[DEBUG] Request received:", req.method, req.url);
    console.log("[DEBUG] Request headers:", JSON.stringify(req.headers));

    // CORS debugging
    console.log("[CORS DEBUG] Request URL:", req.url);
    console.log("[CORS DEBUG] Origin:", req.headers.get("origin"));
    console.log("[CORS DEBUG] Method:", req.method);

    // Get request data
    const requestData = await req.json();
    console.log("[DEBUG] Request data:", JSON.stringify(requestData));

    if (!requestData.companyId) {
      throw new Error("Company ID is required");
    }

    const companyId = requestData.companyId;
    const assessmentPoints = Array.isArray(requestData.assessmentPoints) 
      ? requestData.assessmentPoints 
      : [requestData.assessmentPoints];

    console.log("[DEBUG] Processing research request for company", companyId);

    // Get company name from the database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }
    
    // Create Supabase client with the service role key
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.27.0");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get company name
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      throw new Error(`Failed to fetch company: ${companyError.message}`);
    }

    const companyName = companyData?.name || "Unknown";

    // Create a prompt for Perplexity
    const prompt = `You are a top-tier venture capital (VC) analyst providing comprehensive research about ${companyName}. Based on the following assessment of the company, I need you to conduct deep market research and provide detailed analysis focusing on the LATEST and MOST RELEVANT market information.

Company Assessment Points:
${assessmentPoints.join('\n')}

YOUR RESEARCH SHOULD BE IN THIS FORMAT ONLY, THIS IS THE MOST IMPORTANT PART IN FORMATTING YOUR RESPONSE. ALSO STRICTLY ADHERE TO THE FORMAT INSIDE EACH SECTION:

# Market Research: ${companyName} 

## 1. LATEST NEWS (2023-2024)
Provide 6-8 recent news articles that focus ONLY on breaking industry news, recent events, and current developments directly relevant to this company's market. Each article MUST:
- Have a compelling headline that highlights a RECENT EVENT (not general market facts)
- Include publication name and specific date (month/year) from 2023-2024
- Focus on NEWSWORTHY EVENTS that have happened recently (acquisitions, regulatory changes, new market entrants)
- Include URLs to actual news sources
- NEVER repeat information across different news items
- DONT USE THE SAME NEWS ARTICLE ACROSS THE TWO SECTIONS
- Focus on FACTS, not analysis

Format each news item as:
### [HEADLINE ABOUT A SPECIFIC NEWS EVENT OR DEVELOPMENT]
**Source:** [PUBLICATION NAME], [SPECIFIC DATE]
**Summary:** [2-3 SENTENCES WITH ACTUAL NEWS DETAILS AND IMPACT]
**URL:** [ACTUAL NEWS SOURCE URL]

## 2. MARKET INSIGHTS
Provide 5-7 analytical market insights that are COMPLETELY DIFFERENT from the news section. Each insight MUST:
- Focus on deeper ANALYSIS, TRENDS and MARKET DATA (not news events)
- Include specific market statistics, growth projections, or competitive analysis
- Present data-driven insights about market dynamics, NOT breaking news
- Include different information than what's in the news section
- Focus on ANALYSIS, not facts

Format each market insight as:
### [ANALYTICAL INSIGHT HEADLINE WITH SPECIFIC DATA POINT]
**Source:** [RESEARCH FIRM/PUBLICATION], [DATE]
**Analysis:** [2-3 SENTENCES OF MARKET ANALYSIS WITH NUMERICAL DATA]
**URL:** [URL TO MARKET RESEARCH OR ANALYSIS]

## 3. RESEARCH SUMMARY
Synthesize your findings into a concise summary with:
- Overview of market size, growth projections, and competitive landscape
- Specific opportunities and risks for this company
- Strategic recommendations based on latest market data

EXTREMELY IMPORTANT:
- For NEWS: Focus ONLY on RECENT EVENTS and DEVELOPMENTS that have actually happened
- For INSIGHTS: Focus ONLY on ANALYSIS, TRENDS and MARKET DATA (completely different from news)
- EVERY news item and insight must include SPECIFIC NUMERICAL DATA (dollar amounts, percentages, timeframes)
- Focus EXCLUSIVELY on information directly relevant to this company's business model
- Include ACTUAL URLs to all sources
- Structure exactly as outlined above with clear sections and formatting
- NEVER repeat the same information across different sections`;

    // Call Perplexity API
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key is not configured");
    }

    console.log("[DEBUG] Sending request to Perplexity API");
    console.log("[DEBUG] Prompt:", prompt.substring(0, 200) + "...");

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst specializing in market research. Provide factual, recent information with specific data points. Always include source URLs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        top_p: 0.9,
        frequency_penalty: 0.5,
        search_recency_filter: "month"
      })
    });

    console.log("[DEBUG] Perplexity API response status:", perplexityResponse.status);
    
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
    }

    const responseData = await perplexityResponse.json();
    console.log("[DEBUG] Received response from Perplexity API");
    console.log("[DEBUG] Response structure:", JSON.stringify(Object.keys(responseData)));

    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      throw new Error("Invalid response format from Perplexity API");
    }

    const researchText = responseData.choices[0].message.content;
    console.log("[DEBUG] Research text length:", researchText.length);
    console.log("[DEBUG] Research text preview:", researchText.substring(0, 200) + "...");

    // Extract research summary from the response
    console.log("[DEBUG] Extracting research summary");
    const researchSummary = extractResearchSummary(researchText);
    console.log("[DEBUG] Research summary length:", researchSummary.length);
    console.log("[DEBUG] Research summary preview:", researchSummary.substring(0, 200) + "...");

    // Extract sources, news highlights, and market insights
    console.log("[DEBUG] Extracting sources");
    const sources = extractSources(researchText);
    console.log("[DEBUG] Extracted sources count:", sources.length);

    console.log("[DEBUG] Extracting news highlights");
    const newsHighlights = extractNewsHighlights(researchText);
    console.log("[DEBUG] Extracted news highlights count:", newsHighlights.length);
    console.log("[DEBUG] News highlights sample:", newsHighlights.length > 0 ? JSON.stringify(newsHighlights[0]) : "none");

    console.log("[DEBUG] Extracting market insights");
    const marketInsights = extractMarketInsights(researchText);
    console.log("[DEBUG] Extracted market insights count:", marketInsights.length);
    console.log("[DEBUG] Market insights sample:", marketInsights.length > 0 ? JSON.stringify(marketInsights[0]) : "none");

    // Store research in the database
    const timestamp = new Date().toISOString();
    
    // First, store the research text in the companies table
    const { error: updateCompanyError } = await supabase
      .from('companies')
      .update({
        perplexity_response: researchText,
        perplexity_requested_at: timestamp,
        perplexity_prompt: prompt
      })
      .eq('id', companyId);

    if (updateCompanyError) {
      console.error("Error updating company with research text:", updateCompanyError);
      throw new Error(`Failed to update company with research text: ${updateCompanyError.message}`);
    }

    // Then, store the structured data in the market_research table
    const { data: researchData, error: insertResearchError } = await supabase
      .from('market_research')
      .insert({
        company_id: companyId,
        research_text: researchText,
        research_summary: researchSummary, // Store the extracted research summary
        sources: sources,
        news_highlights: newsHighlights,
        market_insights: marketInsights,
        status: 'completed',
        requested_at: timestamp,
        completed_at: timestamp,
        prompt: prompt
      })
      .select()
      .single();

    if (insertResearchError) {
      console.error("Error storing market research:", insertResearchError);
      throw new Error(`Failed to store market research: ${insertResearchError.message}`);
    }

    console.log("[DEBUG] Successfully completed research for company", companyId);

    // Return the research data
    console.log("[DEBUG] Preparing response with CORS headers");
    return new Response(
      JSON.stringify({
        success: true,
        researchId: researchData.id,
        companyName,
        research: researchText,
        researchSummary, // Include the research summary in the response
        newsHighlights,
        marketInsights,
        sources,
        timestamp
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error("Error in perplexity research function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});

// New function to specifically extract the Research Summary section
function extractResearchSummary(text: string): string {
  try {
    // Look for the research summary section in the text
    const researchSummaryRegex = /## 3\.\s*RESEARCH SUMMARY\s*([\s\S]*?)(?=(##|$))/i;
    const match = text.match(researchSummaryRegex);
    
    if (match && match[1]) {
      console.log("[DEBUG] Successfully extracted research summary section");
      return match[1].trim();
    }
    
    // If the above regex doesn't match, try an alternative approach
    const altResearchSummaryRegex = /(?:RESEARCH SUMMARY|Research Summary)[\s\S]*?((?:###[^#]+)+)/i;
    const altMatch = text.match(altResearchSummaryRegex);
    
    if (altMatch && altMatch[1]) {
      console.log("[DEBUG] Extracted research summary using alternative pattern");
      return altMatch[1].trim();
    }
    
    console.log("[WARNING] Could not extract research summary section");
    return "";
  } catch (error) {
    console.error("[ERROR] Error extracting research summary:", error);
    return "";
  }
}

function extractSources(text: string): Source[] {
  const sources: Source[] = [];
  const urlRegex = /\*\*URL:\*\* (https?:\/\/[^\s]+)/g;
  const nameUrlRegex = /\*\*Source:\*\* ([^(]+?)(?: \(([^)]+)\))? \((https?:\/\/[^\s]+)\)/g;
  
  // Extract URLs from the "URL:" format
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (url && !sources.some(s => s.url === url)) {
      sources.push({
        name: "Source",
        url: url
      });
    }
  }
  
  // Extract name-URL pairs from the Source: format
  const sourceLines = text.match(/\*\*Source:\*\*.*$/gm) || [];
  for (const line of sourceLines) {
    const sourceName = line.match(/\*\*Source:\*\* ([^(]+)/) || [];
    const urlMatch = line.match(/(https?:\/\/[^\s)]+)(?:\))?$/);
    
    if (urlMatch && urlMatch[1]) {
      const url = urlMatch[1].replace(/\)$/, ''); // Remove trailing parenthesis if present
      if (url && !sources.some(s => s.url === url)) {
        sources.push({
          name: sourceName[1] ? sourceName[1].trim() : "Source",
          url: url
        });
      }
    }
  }
  
  return sources;
}

function extractNewsHighlights(text: string): NewsHighlight[] {
  const newsHighlights: NewsHighlight[] = [];
  
  // Find the LATEST NEWS section
  const newsRegex = /## 1\. LATEST NEWS[\s\S]*?(?=## 2\.|$)/i;
  const newsSection = text.match(newsRegex);
  
  if (!newsSection) {
    console.log("[DEBUG] No LATEST NEWS section found");
    return newsHighlights;
  }
  
  // Extract each news item
  const newsContent = newsSection[0];
  const newsItemRegex = /### (.*?)(?=### |## 2\.|$)/gs;
  const newsMatches = [...newsContent.matchAll(newsItemRegex)];
  
  for (const match of newsMatches) {
    if (!match[1] || match[1].trim() === "") continue;
    
    const newsItem = match[1].trim();
    
    // Extract headline (first line)
    const headlineMatch = newsItem.match(/^(.*?)(?=\n|$)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : "";
    
    // Extract source
    const sourceMatch = newsItem.match(/\*\*Source:\*\* (.*?)(?=\n|$)/);
    const source = sourceMatch ? sourceMatch[1].trim() : "";
    
    // Extract summary
    const summaryMatch = newsItem.match(/\*\*Summary:\*\* (.*?)(?=\n\*\*URL|$)/s);
    const content = summaryMatch ? summaryMatch[1].trim() : "";
    
    // Extract URL
    const urlMatch = newsItem.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1].trim() : "";
    
    if (headline) {
      newsHighlights.push({
        headline,
        content,
        source,
        url
      });
    }
  }
  
  return newsHighlights;
}

function extractMarketInsights(text: string): MarketInsight[] {
  const marketInsights: MarketInsight[] = [];
  
  // Find the MARKET INSIGHTS section
  const insightsRegex = /## 2\. MARKET INSIGHTS[\s\S]*?(?=## 3\.|$)/i;
  const insightsSection = text.match(insightsRegex);
  
  if (!insightsSection) {
    console.log("[DEBUG] No MARKET INSIGHTS section found");
    return marketInsights;
  }
  
  // Extract each insight item 
  const insightsContent = insightsSection[0];
  
  // Try different patterns for market insights
  // First try the numbered format (### 1. Title)
  const numberedInsightRegex = /### \d+\.\s+\*\*([^*]+)\*\*[\s\S]*?(?=### \d+\.|## 3\.|$)/g;
  let numberedMatches = [...insightsContent.matchAll(numberedInsightRegex)];
  
  if (numberedMatches.length > 0) {
    for (const match of numberedMatches) {
      if (!match[0]) continue;
      
      const insightText = match[0];
      const headlineMatch = match[1]?.trim(); // Get the title from the capture group
      
      // Extract source
      const sourceMatch = insightText.match(/\*\*Source:\*\*\s*(.*?)(?=\n|$)/);
      const source = sourceMatch ? sourceMatch[1].trim() : "";
      
      // Extract content - try to get everything between the headline and URL or next section
      let content = "";
      const contentMatch = insightText.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\*\*URL|$)/i);
      if (contentMatch && contentMatch[1]) {
        content = contentMatch[1].trim();
      } else {
        // Fallback: try to get all text after the headline
        const fallbackContentMatch = insightText.match(/\*\*([^*]+)\*\*\s*([\s\S]*?)(?=\*\*URL|$)/i);
        if (fallbackContentMatch && fallbackContentMatch[2]) {
          content = fallbackContentMatch[2].trim();
        }
      }
      
      // Extract URL
      const urlMatch = insightText.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s\n\]]+)/i);
      let url = urlMatch ? urlMatch[1].trim() : "";
      
      // Check for URL in parentheses format
      if (!url) {
        const parenthesesUrlMatch = insightText.match(/\((https?:\/\/[^\s\)]+)\)/);
        url = parenthesesUrlMatch ? parenthesesUrlMatch[1].trim() : "";
      }
      
      // Check for URL in the content
      if (!url) {
        const contentUrlMatch = content.match(/(https?:\/\/[^\s\n\]]+)/);
        if (contentUrlMatch) {
          url = contentUrlMatch[1].trim();
          // Remove the URL from the content
          content = content.replace(url, "").trim();
        }
      }
      
      // Clean up content - remove URL markers if they exist
      content = content.replace(/\*\*URL:\*\*.*$/, "").trim();
      
      if (headlineMatch) {
        marketInsights.push({
          headline: headlineMatch,
          content,
          source,
          url
        });
      }
    }
  } 
  
  // If no numbered insights found, try the regular ### Headline format
  if (marketInsights.length === 0) {
    const regularInsightRegex = /### ([^\n]+)[\s\S]*?(?=### |## 3\.|$)/g;
    let regularMatches = [...insightsContent.matchAll(regularInsightRegex)];
    
    for (const match of regularMatches) {
      if (!match[0]) continue;
      
      const insightText = match[0];
      const headline = match[1]?.trim(); // The headline is the captured group
      
      // Extract source
      const sourceMatch = insightText.match(/\*\*Source:\*\*\s*(.*?)(?=\n|$)/);
      const source = sourceMatch ? sourceMatch[1].trim() : "";
      
      // Extract content - get everything between the headline and URL or next section
      let content = "";
      const contentMatch = insightText.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\*\*URL|$)/i);
      if (contentMatch && contentMatch[1]) {
        content = contentMatch[1].trim();
      } else {
        // Fallback: get all text after the headline, excluding source and URL
        const lines = insightText.split('\n').slice(1); // Skip the headline line
        content = lines
          .filter(line => !line.includes('**Source:**') && !line.includes('**URL:**'))
          .join(' ')
          .trim();
      }
      
      // Extract URL
      const urlMatch = insightText.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s\n\]]+)/i);
      let url = urlMatch ? urlMatch[1].trim() : "";
      
      // Clean up content - remove URL if it exists
      if (url) {
        content = content.replace(url, "").trim();
      }
      
      if (headline) {
        marketInsights.push({
          headline,
          content,
          source,
          url
        });
      }
    }
  }
  
  // If still no insights found, try parsing numbered list items (1. Title)
  if (marketInsights.length === 0) {
    const listItemRegex = /(?:^|\n)(\d+\.\s+\*\*[^*]+\*\*)[\s\S]*?(?=\n\d+\.\s+\*\*|\n## |$)/g;
    let listMatches = [...insightsContent.matchAll(listItemRegex)];
    
    for (const match of listMatches) {
      if (!match[0]) continue;
      
      const insightText = match[0];
      
      // Extract headline - format: "1. **Title**"
      const headlineMatch = insightText.match(/\d+\.\s+\*\*([^*]+)\*\*/);
      const headline = headlineMatch ? headlineMatch[1].trim() : "";
      
      // Extract source
      const sourceMatch = insightText.match(/(?:Source:|source:)\s*([^\n]+)/i);
      const source = sourceMatch ? sourceMatch[1].trim() : "";
      
      // Extract content - get everything after the headline excluding the source
      let content = insightText;
      if (headlineMatch) {
        content = content.replace(headlineMatch[0], "").trim();
      }
      if (sourceMatch) {
        content = content.replace(sourceMatch[0], "").trim();
      }
      
      // Extract URL
      const urlMatch = insightText.match(/(https?:\/\/[^\s\n\]]+)/);
      let url = urlMatch ? urlMatch[1].trim() : "";
      
      // Clean up content
      if (sourceMatch) {
        content = content.replace(sourceMatch[0], "").trim();
      }
      if (urlMatch) {
        content = content.replace(urlMatch[0], "").trim();
      }
      
      marketInsights.push({
        headline,
        content,
        source,
        url
      });
    }
  }
  
  // Final fallback - if still no insights found, try to extract paragraphs
  if (marketInsights.length === 0) {
    // Split content into paragraphs
    const paragraphs = insightsContent.split("\n\n").filter(p => p.trim() !== "");
    
    // Skip the first paragraph if it's the section heading
    const startIndex = paragraphs[0].trim().startsWith("## 2. MARKET INSIGHTS") ? 1 : 0;
    
    for (let i = startIndex; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // Skip if it's too short
      if (paragraph.length < 10) continue;
      
      // Generate a headline from the first sentence
      const firstSentence = paragraph.split('. ')[0];
      const headline = firstSentence.length > 60 
        ? firstSentence.substring(0, 57) + '...' 
        : firstSentence;
      
      // Extract source if available
      const sourceMatch = paragraph.match(/(?:Source:|source:)\s*([^\n]+)/i);
      const source = sourceMatch ? sourceMatch[1].trim() : "";
      
      // Extract URL if available
      const urlMatch = paragraph.match(/(https?:\/\/[^\s\n\]]+)/);
      const url = urlMatch ? urlMatch[1].trim() : "";
      
      // The content is the whole paragraph
      let content = paragraph;
      
      // Clean up content
      if (sourceMatch) {
        content = content.replace(sourceMatch[0], "").trim();
      }
      if (urlMatch) {
        content = content.replace(urlMatch[0], "").trim();
      }
      
      marketInsights.push({
        headline,
        content,
        source,
        url
      });
    }
  }
  
  return marketInsights;
}
