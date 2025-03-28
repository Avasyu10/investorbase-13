
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Perplexity API configuration
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Timeout for the function (5 minutes)
const TIMEOUT_MS = 5 * 60 * 1000;

// Supabase configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // CORS handling
  console.log("[DEBUG] Request received:", req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[CORS DEBUG] Method:", req.method);
    console.log("[CORS DEBUG] Origin:", req.headers.get("origin"));
    console.log("[CORS DEBUG] Request URL:", req.url);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    const requestData = await req.json().catch(e => {
      console.error("Error parsing request body:", e);
      throw new Error("Invalid JSON in request body");
    });
    
    console.log("[DEBUG] Request data:", JSON.stringify(requestData));
    
    const { companyId, assessmentPoints, userId } = requestData;
    
    if (!companyId || !userId || !assessmentPoints || !Array.isArray(assessmentPoints)) {
      throw new Error("Missing required parameters: companyId, userId, or assessmentPoints");
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create a new investor research record
    const { data: investorResearch, error: insertError } = await supabase
      .from("investor_research")
      .insert({
        company_id: companyId,
        user_id: userId,
        status: "pending",
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("[DEBUG] Error inserting investor research record:", insertError);
      throw new Error(`Failed to create investor research record: ${insertError.message}`);
    }

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

    // Generate the prompt for Perplexity
    const companyStage = "Seed"; // Default to Seed stage if not available
    const prompt = generatePrompt(company.name, companyStage, assessmentPoints);
    
    // Update the research record with the prompt
    await supabase
      .from("investor_research")
      .update({
        prompt,
        status: "processing"
      })
      .eq("id", investorResearch.id);

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
          model: "sonar-deep-research",
          messages: [
            {
              role: "system",
              content: "You are a specialized investment analyst with expertise in financial markets and industry trends."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000,
          presence_penalty: 0,
          frequency_penalty: 0.1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Parse Perplexity API response
      console.log("[DEBUG] Perplexity API response status:", perplexityResponse.status);
      const data = await perplexityResponse.json();
      console.log("[DEBUG] Response structure:", Object.keys(data));
      
      // Extract research text from Perplexity response
      const researchText = data.choices?.[0]?.message?.content || "";
      console.log("[DEBUG] Research text length:", researchText.length);
      console.log("[DEBUG] Research text preview:", researchText.substring(0, 100) + "...");
      
      // Extract structured data
      const { researchSummary, marketInsights, newsHighlights, sources } = extractStructuredData(researchText);
      
      // Update the research record with the results
      await supabase
        .from("investor_research")
        .update({
          response: researchText,
          research_summary: researchSummary,
          market_insights: marketInsights,
          news_highlights: newsHighlights,
          sources: sources,
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", investorResearch.id);
      
      console.log("[DEBUG] Successfully completed investor research for company", companyId);
      
      // Return the research data
      return new Response(JSON.stringify({
        id: investorResearch.id,
        research: researchText,
        researchSummary,
        marketInsights,
        newsHighlights,
        sources
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle API call errors
      console.error("[DEBUG] Error calling Perplexity API:", error);
      
      // Update the research record with the error
      await supabase
        .from("investor_research")
        .update({
          status: "failed",
          error_message: error.message || "Unknown error calling Perplexity API"
        })
        .eq("id", investorResearch.id);
      
      // Handle timeout specifically
      if (error.name === "AbortError") {
        throw new Error("Research timed out after " + (TIMEOUT_MS / 1000) + " seconds");
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error in investor research perplexity function:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Unknown error in investor research function"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

// Helper function to generate the prompt for Perplexity
function generatePrompt(companyName: string, companyStage: string, assessmentPoints: string[]): string {
  const assessmentText = assessmentPoints.join("\n\n");
  
  return `You are a top-tier venture capital (VC) Investor and Partner providing comprehensive research about ${companyName} - ${companyStage}. Based on the following assessment of the company, I need you to conduct deep market research like a professional investor, and provide investor-focused insights:

Assessment Points:
${assessmentText}

Please only response with the text that will be shown on the UI screen to real-life investors.

Be specific, precise, and factual. Focus on providing high-quality, actionable intelligence for investment decision-making.`;
}

// Helper function to extract structured data from research text
function extractStructuredData(researchText: string) {
  let researchSummary = "";
  const marketInsights: any[] = [];
  const newsHighlights: any[] = [];
  const sources: any[] = [];

  try {
    // Extract research summary (looking for a section between headers)
    const summaryMatch = researchText.match(/## 2\. MARKET OVERVIEW\s*([\s\S]*?)(?=##)/i);
    if (summaryMatch && summaryMatch[1]) {
      researchSummary = summaryMatch[1].trim();
    } else {
      // Alternative pattern
      const altSummaryMatch = researchText.match(/# Market Research[\s\S]*?(?=## 1\.)/i);
      if (altSummaryMatch) {
        researchSummary = altSummaryMatch[0].trim();
      }
    }
    
    console.log("[DEBUG] Extracted research summary using alternative pattern");
    console.log("[DEBUG] Research summary length:", researchSummary.length);
    console.log("[DEBUG] Research summary preview:", researchSummary.substring(0, 100) + "...");

    // Extract sources
    const sourcesSection = researchText.match(/## 6\. SOURCES\s*([\s\S]*?)(?=$)/i);
    if (sourcesSection && sourcesSection[1]) {
      const sourceLines = sourcesSection[1].trim().split('\n');
      sourceLines.forEach(line => {
        if (line.trim()) {
          sources.push({
            name: line.trim(),
            url: extractUrlFromText(line) || ""
          });
        }
      });
    }
    console.log("[DEBUG] Extracting sources");
    console.log("[DEBUG] Extracted sources count:", sources.length);

    // Extract news highlights
    const newsSection = researchText.match(/## 1\. LATEST NEWS[\s\S]*?(?=## 2\.)/i);
    if (newsSection) {
      const newsText = newsSection[0];
      const newsItems = newsText.split(/(?=\*\*|(?:\d+\.)\s+[A-Z])/g).slice(1);
      
      newsItems.forEach(item => {
        const headlineMatch = item.match(/(?:\*\*|(?:\d+\.)\s+)([^\n]+)/);
        if (headlineMatch) {
          const headline = headlineMatch[1].replace(/\*\*/g, '').trim();
          const contentMatch = item.match(/(?:\*\*[^\n]+\*\*|(?:\d+\.)[^\n]+)\s*([\s\S]*?)(?=\*\*Source|Source|\[Source\]|$)/i);
          const content = contentMatch ? contentMatch[1].trim() : "";
          const sourceMatch = item.match(/(?:\*\*Source\*\*|\[Source\]|Source):?\s*([^\n]+)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : "";
          const url = extractUrlFromText(item);
          
          newsHighlights.push({
            headline,
            content,
            source,
            url: url || ""
          });
        }
      });
    }
    console.log("[DEBUG] Extracting news highlights");
    console.log("[DEBUG] Extracted news highlights count:", newsHighlights.length);
    console.log("[DEBUG] News highlights sample:", JSON.stringify(newsHighlights[0]));

    // Extract market insights
    const insightsSection = researchText.match(/## 4\. INVESTOR INSIGHTS[\s\S]*?(?=## 5\.)/i);
    if (insightsSection) {
      const insightsText = insightsSection[0];
      const insights = insightsText.split(/(?=\*\*|(?:\d+\.)\s+[A-Z])/g).slice(1);
      
      insights.forEach(item => {
        const headlineMatch = item.match(/(?:\*\*|(?:\d+\.)\s+)([^\n]+)/);
        if (headlineMatch) {
          const headline = headlineMatch[1].replace(/\*\*/g, '').trim();
          const contentMatch = item.match(/(?:\*\*[^\n]+\*\*|(?:\d+\.)[^\n]+)\s*([\s\S]*?)(?=\*\*Source|Source|\[Source\]|$)/i);
          const content = contentMatch ? contentMatch[1].trim() : "";
          const sourceMatch = item.match(/(?:\*\*Source\*\*|\[Source\]|Source):?\s*([^\n]+)/i);
          const source = sourceMatch ? sourceMatch[1].trim() : "";
          const url = extractUrlFromText(item);
          
          marketInsights.push({
            headline,
            content,
            source,
            url: url || ""
          });
        }
      });
    }
    console.log("[DEBUG] Extracting market insights");
    console.log("[DEBUG] Extracted market insights count:", marketInsights.length);
    console.log("[DEBUG] Market insights sample:", JSON.stringify(marketInsights[0]));

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

// Helper function to extract URLs from text
function extractUrlFromText(text: string): string | null {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}
