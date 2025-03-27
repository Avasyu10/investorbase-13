
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

type NewsHighlight = {
  headline: string;
  content: string;
  source?: string;
  url?: string;
};

type MarketInsight = {
  title: string;
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

Your research should include:

# Market Research: ${companyName} 

## 1. LATEST NEWS (2023-2024)
Provide 6-8 recent news articles directly relevant to this company's market, each with:
- Compelling headline specific to this company's sector
- Publication source and date (in parentheses)
- Brief 2-3 sentence summary with SPECIFIC NUMBERS relevant to this company
- URL to the source

Format each as:
### [HEADLINE]
**Source:** [PUBLICATION], [DATE]
**Summary:** [2-3 SENTENCES WITH CONCRETE DATA POINTS]
**URL:** [ACTUAL URL]

## 2. MARKET INSIGHTS
Provide 5-7 key market insights directly relevant to this company, each with:
- Specific market data with EXACT dollar figures (market size, growth rates, etc.)
- Concrete trends affecting this specific business
- Reference to reputable sources with URLs

Format each with a clear title, 3-4 sentences with DATA, and source link.

## 3. RESEARCH SUMMARY
Synthesize your findings into a concise summary with:
- Overview of market size, growth projections, and competitive landscape
- Specific opportunities and risks for this company
- Strategic recommendations based on latest market data

EXTREMELY IMPORTANT:
- ONLY include FACTUAL, RECENT information from reputable sources
- EVERY insight must include SPECIFIC NUMERICAL DATA (dollar amounts, percentages, timeframes)
- Focus EXCLUSIVELY on information directly relevant to this company's business model
- Include ACTUAL URLs to all sources
- Structure exactly as outlined above with clear sections and formatting`;

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
        model: "llama-3.1-sonar-small-128k-online",
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
        presence_penalty: 0.1,
        search_domain_filter: ["news.google.com", "bloomberg.com", "forbes.com", "wsj.com", "ft.com", "cnbc.com", "reuters.com", "techcrunch.com"],
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
        perplexity_requested_at: timestamp
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
        sources: sources,
        news_highlights: newsHighlights,
        market_insights: marketInsights,
        status: 'completed',
        requested_at: timestamp,
        completed_at: timestamp
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
  const latestNewsSection = text.match(/## 1\. LATEST NEWS[\s\S]*?(?=## 2\.|$)/i);
  
  if (!latestNewsSection) {
    console.log("[DEBUG] No LATEST NEWS section found");
    return newsHighlights;
  }
  
  const newsSection = latestNewsSection[0];
  
  // Extract individual news items
  const newsItems = newsSection.split(/### /g).slice(1); // Skip the section header
  
  for (const item of newsItems) {
    const headlineMatch = item.match(/^([^\n]+)/);
    const sourceMatch = item.match(/\*\*Source:\*\* ([^\n]+)/);
    const summaryMatch = item.match(/\*\*Summary:\*\* ([^\n]+)/);
    const urlMatch = item.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/);
    
    if (headlineMatch) {
      const headline = headlineMatch[1].trim();
      const source = sourceMatch ? sourceMatch[1].trim() : undefined;
      const content = summaryMatch ? summaryMatch[1].trim() : "";
      const url = urlMatch ? urlMatch[1].trim() : undefined;
      
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
  const marketInsightsSection = text.match(/## 2\. MARKET INSIGHTS[\s\S]*?(?=## 3\.|$)/i);
  
  if (!marketInsightsSection) {
    console.log("[DEBUG] No MARKET INSIGHTS section found");
    return marketInsights;
  }
  
  const insightsSection = marketInsightsSection[0];
  
  // Extract individual insight items
  const insightItems = insightsSection.split(/### |(?=^[A-Z][^\n]+\n)/gm).slice(1);
  
  if (insightItems.length === 0) {
    // Try another approach if the first split didn't work
    const paragraphs = insightsSection.split(/\n\n+/).slice(1);
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') continue;
      
      const titleMatch = paragraph.match(/^([^\n\.]+)/);
      const sourceMatch = paragraph.match(/\*\*Source:\*\* ([^\n]+)/);
      const urlMatch = paragraph.match(/(https?:\/\/[^\s\)]+)/);
      
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const source = sourceMatch ? sourceMatch[1].trim() : undefined;
        const url = urlMatch ? urlMatch[1].trim() : undefined;
        
        // Remove title, source, and URL from content
        let content = paragraph
          .replace(/^[^\n\.]+/, '')
          .replace(/\*\*Source:\*\* [^\n]+/, '')
          .replace(/https?:\/\/[^\s\)]+/, '')
          .trim();
          
        marketInsights.push({
          title,
          content,
          source,
          url
        });
      }
    }
  } else {
    for (const item of insightItems) {
      if (item.trim() === '') continue;
      
      const titleMatch = item.match(/^([^\n]+)/);
      const sourceMatch = item.match(/\*\*Source:\*\* ([^\n]+)/);
      const urlMatch = item.match(/(https?:\/\/[^\s\)]+)/);
      
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const source = sourceMatch ? sourceMatch[1].trim() : undefined;
        const url = urlMatch ? urlMatch[1].trim() : undefined;
        
        // Extract content (everything between title and source/URL)
        let content = item.substring(titleMatch[0].length).trim();
        if (sourceMatch) {
          content = content.substring(0, content.indexOf('**Source')).trim();
        } else if (urlMatch) {
          const urlIndex = content.indexOf(urlMatch[1]);
          if (urlIndex !== -1) {
            content = content.substring(0, urlIndex).trim();
          }
        }
        
        marketInsights.push({
          title,
          content,
          source,
          url
        });
      }
    }
  }
  
  return marketInsights;
}
