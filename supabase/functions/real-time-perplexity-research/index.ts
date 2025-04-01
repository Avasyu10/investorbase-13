
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "./cors.ts";

// Configuration constants
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Function timeout (5 minutes)
const TIMEOUT_MS = 5 * 60 * 1000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[CORS DEBUG] Method:", req.method);
    console.log("[CORS DEBUG] Origin:", req.headers.get("origin"));
    console.log("[CORS DEBUG] Request URL:", req.url);
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request data
    const requestData = await req.json();
    console.log("[DEBUG] Request data:", JSON.stringify(requestData));
    
    const { companyId, assessmentPoints } = requestData;
    
    if (!companyId || !assessmentPoints || !Array.isArray(assessmentPoints)) {
      throw new Error("Missing required parameters: companyId or assessmentPoints");
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get company details for the prompt
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
      
    if (companyError) {
      console.error("[DEBUG] Error fetching company:", companyError);
      throw new Error(`Failed to fetch company: ${companyError.message}`);
    }
    
    console.log("[DEBUG] Processing research request for company", companyId);
    
    // Create a new market_research record
    const { data: market_research, error: insertError } = await supabase
      .from("market_research")
      .insert({
        company_id: companyId,
        status: "processing",
        requested_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (insertError) {
      console.error("[DEBUG] Error inserting market_research record:", insertError);
      throw new Error(`Failed to create market research record: ${insertError.message}`);
    }
    
    // Generate the prompt for Perplexity
    const companyName = company?.name || "the company";
    const prompt = generatePrompt(companyName, assessmentPoints);
    
    console.log("[DEBUG] Prompt:", prompt.substring(0, 100) + "...");
    
    // Set a timeout for the Perplexity API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      // Call Perplexity API
      console.log("[DEBUG] Sending request to Perplexity API");
      const perplexityResponse = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sonar-medium-online",
          messages: [
            {
              role: "system",
              content: "You are a top-tier venture capital (VC) analyst providing comprehensive market research."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("[DEBUG] Perplexity API response status:", perplexityResponse.status);
      
      // Parse Perplexity API response
      const data = await perplexityResponse.json();
      console.log("[DEBUG] Response structure:", Object.keys(data));
      
      // Extract research text from Perplexity response
      const researchText = data.choices?.[0]?.message?.content || "";
      console.log("[DEBUG] Research text length:", researchText.length);
      console.log("[DEBUG] Research text preview:", researchText.substring(0, 100) + "...");
      
      // Extract structured data from research
      const { researchSummary, marketInsights, newsHighlights, sources } = extractStructuredData(researchText);
      
      // Update company record with research data
      await supabase
        .from("companies")
        .update({
          perplexity_response: researchText,
          perplexity_requested_at: new Date().toISOString()
        })
        .eq("id", companyId);
      
      // Update market_research record
      await supabase
        .from("market_research")
        .update({
          research_text: researchText,
          research_summary: researchSummary,
          market_insights: marketInsights,
          news_highlights: newsHighlights,
          sources: sources,
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", market_research.id);
      
      console.log("[DEBUG] Successfully completed research for company", companyId);
      
      // Prepare response
      const response = {
        success: true,
        research: formatResearchHtml(researchText),
        researchId: market_research.id,
        requestedAt: new Date().toISOString()
      };
      
      console.log("[DEBUG] Preparing response with CORS headers");
      
      // Return response with CORS headers
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Update market_research record with error
      await supabase
        .from("market_research")
        .update({
          status: "failed",
          error_message: error.message || "Unknown error"
        })
        .eq("id", market_research.id);
      
      // Handle timeout specifically
      if (error.name === "AbortError") {
        throw new Error("Research timed out after " + (TIMEOUT_MS / 1000) + " seconds");
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error in real-time-perplexity-research function:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Helper function to generate the prompt for Perplexity
function generatePrompt(companyName: string, assessmentPoints: string[]): string {
  const assessmentText = assessmentPoints.join("\n\n");
  
  return `You are a top-tier venture capital (VC) analyst providing comprehensive research about ${companyName}. Based on the following assessment of the company, I need you to conduct deep market research and provide detailed insights structured in the following sections:

Assessment Points:
${assessmentText}

Your response should be structured as follows:

# Market Research: ${companyName}

## 1. LATEST NEWS (2023-2024)
Provide 5-7 recent, specific news items directly relevant to ${companyName}'s market or industry. Each news item should have a clear headline, source, date, and brief analysis of implications. News should be VERY SPECIFIC (not generic market observations) and focus on CONCRETE RECENT EVENTS with actual dates and sources. Format each entry with a headline, source, date, and analysis paragraph.

## 2. MARKET OVERVIEW
Provide a detailed market overview with concrete statistics, market size, growth rates, and key trends. Include specific numbers, dates, and sources.

## 3. COMPETITIVE LANDSCAPE
Analyze 3-5 direct competitors, their strengths, weaknesses, market share, and recent moves.

## 4. MARKET INSIGHTS
Provide 5-7 in-depth market insights relevant to ${companyName}'s business model. Each insight should have a clear headline, source information, and detailed analysis that goes beyond superficial observations. Format each with a headline, source, and detailed analysis paragraph that includes specific data points, trends, or implications.

## 5. STRATEGIC RECOMMENDATIONS
Based on all the above research, provide 3-5 actionable strategic recommendations for ${companyName}.

Important guidelines:
1. Ensure CLEAR DISTINCTION between Latest News (specific recent events) and Market Insights (broader analysis and data-driven observations).
2. Include specific statistics, dates, and quantitative data throughout.
3. Cite credible sources for all information.
4. Focus on actionable insights relevant to ${companyName}'s business model and assessment points.
5. Be factual, specific, and avoid generic statements.`;
}

// Helper function to extract structured data from research text
function extractStructuredData(text: string) {
  let researchSummary = "";
  const marketInsights: any[] = [];
  const newsHighlights: any[] = [];
  const sources: any[] = [];

  try {
    // Extract research summary (market overview + strategic recommendations)
    const summaryMatch = text.match(/## 2\. MARKET OVERVIEW[\s\S]*?(?=## 3\.)/i);
    const recommendationsMatch = text.match(/## 5\. STRATEGIC RECOMMENDATIONS[\s\S]*?(?=$)/i);
    
    if (summaryMatch) {
      researchSummary = summaryMatch[0];
      
      if (recommendationsMatch) {
        researchSummary += "\n\n" + recommendationsMatch[0];
      }
    }
    
    // Extract news highlights
    const newsSection = text.match(/## 1\. LATEST NEWS[\s\S]*?(?=## 2\.)/i);
    if (newsSection) {
      const newsText = newsSection[0];
      const newsItems = newsText.split(/(?=### |(?:\d+\.) )/g).slice(1);
      
      newsItems.forEach(item => {
        const headlineMatch = item.match(/(?:### |(?:\d+\.) )([^\n]+)/);
        
        if (headlineMatch) {
          const headline = headlineMatch[1].replace(/\*\*/g, '').trim();
          
          // Extract source and date
          const sourceMatch = item.match(/(?:\*\*Source:?\*\*|Source:?)[\s:]*(.*?)(?:\n|$)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : "";
          
          // Extract content/summary
          const contentMatch = item.match(/(?:\*\*(?:Summary|Analysis):?\*\*|Analysis:?|Summary:?)[\s:]*([\s\S]*?)(?=\*\*Source|\*\*Analysis|$)/i);
          let content = "";
          
          if (contentMatch) {
            content = contentMatch[1].trim();
          } else {
            // Alternative extraction if specific labels aren't found
            const altContentMatch = item.substring(headlineMatch[0].length).match(/(?:\*\*Source:?\*\*|Source:?)[\s:]*(.*?)(?:\n|$)/i);
            if (altContentMatch) {
              content = item.substring(headlineMatch[0].length, item.indexOf(altContentMatch[0])).trim();
            } else {
              content = item.substring(headlineMatch[0].length).trim();
            }
          }
          
          // Extract URL if available
          const urlMatch = item.match(/(https?:\/\/[^\s]+)/);
          const url = urlMatch ? urlMatch[1] : "";
          
          newsHighlights.push({
            headline,
            source,
            content,
            url
          });
        }
      });
    }
    
    // Extract market insights
    const insightsSection = text.match(/## 4\. MARKET INSIGHTS[\s\S]*?(?=## 5\.)/i);
    if (insightsSection) {
      const insightsText = insightsSection[0];
      const insights = insightsText.split(/(?=### |(?:\d+\.) )/g).slice(1);
      
      insights.forEach(item => {
        const headlineMatch = item.match(/(?:### |(?:\d+\.) )([^\n]+)/);
        
        if (headlineMatch) {
          const headline = headlineMatch[1].replace(/\*\*/g, '').trim();
          
          // Extract source
          const sourceMatch = item.match(/(?:\*\*Source:?\*\*|Source:?)[\s:]*(.*?)(?:\n|$)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : "";
          
          // Extract content/analysis
          const contentMatch = item.match(/(?:\*\*(?:Analysis|Content):?\*\*|Analysis:?|Content:?)[\s:]*([\s\S]*?)(?=\*\*Source|\*\*Analysis|$)/i);
          let content = "";
          
          if (contentMatch) {
            content = contentMatch[1].trim();
          } else {
            // Alternative extraction if specific labels aren't found
            const altContentMatch = item.substring(headlineMatch[0].length).match(/(?:\*\*Source:?\*\*|Source:?)[\s:]*(.*?)(?:\n|$)/i);
            if (altContentMatch) {
              content = item.substring(headlineMatch[0].length, item.indexOf(altContentMatch[0])).trim();
            } else {
              content = item.substring(headlineMatch[0].length).trim();
            }
          }
          
          // Extract URL if available
          const urlMatch = item.match(/(https?:\/\/[^\s]+)/);
          const url = urlMatch ? urlMatch[1] : "";
          
          marketInsights.push({
            headline,
            source,
            content,
            url
          });
        }
      });
    }
    
    // Extract sources
    const sourcesSection = text.match(/## Sources:?[\s\S]*?$/i) || text.match(/Sources:?[\s\S]*?$/i);
    if (sourcesSection) {
      const sourcesText = sourcesSection[0];
      const sourceLines = sourcesText.split('\n').filter(line => line.trim() && !line.startsWith('##'));
      
      sourceLines.forEach(line => {
        if (line.trim()) {
          // Extract URL if available
          const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
          const url = urlMatch ? urlMatch[1] : "";
          const name = line.replace(url, '').replace(/[\[\]0-9\.]+/g, '').trim();
          
          sources.push({ name, url });
        }
      });
    }
  } catch (error) {
    console.error("Error extracting structured data:", error);
  }

  return {
    researchSummary,
    marketInsights,
    newsHighlights,
    sources
  };
}

// Helper function to format text as HTML
function formatResearchHtml(text: string): string {
  if (!text) return '<p>No research text available</p>';
  
  return text
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-3 mt-6">$1</h1>') // h1
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-2 mt-5">$1</h2>') // h2
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2 mt-4">$1</h3>') // h3
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>') // bold
    .replace(/\*(.*?)\*/gim, '<em>$1</em>') // italic
    .replace(/\n\n/gim, '</p><p class="mb-4">') // paragraphs
    .replace(/^\s*(?:[-*+]|\d+\.)\s+(.*)/gim, '<li>$1</li>') // list items
    .replace(/<\/li>\n<li>/gim, '</li><li>') // fix list items
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>'); // links
}
