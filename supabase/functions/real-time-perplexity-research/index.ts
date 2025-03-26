
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers with origin explicitly allowed
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  console.log(`[CORS DEBUG] Received ${req.method} request`);
  console.log(`[CORS DEBUG] Request URL: ${req.url}`);
  console.log(`[CORS DEBUG] Request headers:`, Object.fromEntries([...req.headers.entries()]));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[CORS DEBUG] Handling OPTIONS preflight request`);
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Get Perplexity API key from environment
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[CORS DEBUG] Missing PERPLEXITY_API_KEY');
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Parse request
    const requestData = await req.json();
    console.log(`[CORS DEBUG] Request data:`, JSON.stringify(requestData));
    
    const { companyId, assessmentPoints } = requestData;
    
    if (!companyId || !assessmentPoints || !Array.isArray(assessmentPoints) || assessmentPoints.length === 0) {
      console.error('[CORS DEBUG] Invalid request data', { companyId, assessmentPointsLength: assessmentPoints?.length });
      throw new Error('Invalid request. Expected companyId and non-empty assessmentPoints array');
    }

    console.log(`[CORS DEBUG] Processing research request for company ${companyId}`);
    
    // Create the Supabase client for database operations
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CORS DEBUG] Missing Supabase credentials');
      throw new Error('Missing Supabase credentials');
    }
    
    // Create a Supabase client with the service role key
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get company info to include in the prompt
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('[CORS DEBUG] Error fetching company:', companyError);
      throw new Error(`Failed to fetch company: ${companyError.message}`);
    }

    const companyName = companyData.name || 'the company';
    const assessmentText = assessmentPoints.join("\n\n");

    // Create a new research record in the database with pending status
    const { data: newResearch, error: insertError } = await supabase
      .from('market_research')
      .insert({
        company_id: companyId,
        prompt: assessmentText,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CORS DEBUG] Error creating research record:', insertError);
      throw new Error(`Failed to create research record: ${insertError.message}`);
    }

    // Create prompt for Perplexity
    const prompt = `You are a top-tier venture capital (VC) analyst providing comprehensive research about ${companyName}. Based on the following assessment of the company, I need you to conduct deep market research and provide detailed, actionable insights in a structured format.

COMPANY ASSESSMENT:
${assessmentText}

Please organize your response into these three distinct sections:

1. LATEST NEWS (2023-2024)
Provide 3-5 recent, relevant news items about this specific industry or market. Each news item should include:
- Headline
- Publication source and date
- 2-3 sentence summary with specific numbers/facts relevant to ${companyName}'s business
- URL to the original source

2. MARKET INSIGHTS
Provide 3-5 strategic market insights including:
- Market size and growth projections with specific data points
- Competitive landscape analysis relevant to ${companyName}
- Emerging trends that could impact ${companyName}'s business model
- Each insight must include specific percentages, figures, and data points
- Each insight must cite reputable sources

3. RESEARCH SUMMARY
Provide a 3-paragraph executive summary that:
- Synthesizes the collected information
- Highlights the most important strategic considerations
- Identifies key risks and opportunities for ${companyName}
- Includes specific actionable advice for the company

Format your response in Markdown with clear section headers. Ensure all data is accurate, recent (2023-2024), and from reputable sources. Include URLs for ALL sources cited.`;

    console.log("[CORS DEBUG] Sending request to Perplexity API");
    
    // Call Perplexity API
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
            content: 'You are a venture capital research analyst providing factual, in-depth market research with specific data points and proper citations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        search_domain_filter: ["news.google.com", "bloomberg.com", "forbes.com", "wsj.com", "ft.com", "cnbc.com", "reuters.com", "techcrunch.com"],
        search_recency_filter: "month",
        frequency_penalty: 1,
        presence_penalty: 0,
        return_images: false,
        return_related_questions: false
      })
    });

    // Check for errors
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`[CORS DEBUG] Perplexity API error (${perplexityResponse.status}):`, errorText);
      
      // Update the research record with error status
      await supabase
        .from('market_research')
        .update({
          status: 'failed',
          error_message: `Perplexity API error: ${perplexityResponse.status} - ${errorText}`,
        })
        .eq('id', newResearch.id);
        
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
    }

    // Process the response
    const responseData = await perplexityResponse.json();
    console.log("[CORS DEBUG] Received response from Perplexity API");
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("[CORS DEBUG] Invalid response format from Perplexity:", responseData);
      
      // Update the research record with error status
      await supabase
        .from('market_research')
        .update({
          status: 'failed',
          error_message: "Invalid response format from Perplexity API",
        })
        .eq('id', newResearch.id);
        
      throw new Error("Invalid response format from Perplexity API");
    }

    const researchText = responseData.choices[0].message.content;
    
    // Extract sources, news highlights, and market insights from the research text
    const sources = extractSources(researchText);
    const newsHighlights = extractNewsHighlights(researchText);
    const marketInsights = extractMarketInsights(researchText);
    
    // Update the research record with the results
    const { error: updateError } = await supabase
      .from('market_research')
      .update({
        research_text: researchText,
        sources: sources,
        news_highlights: newsHighlights,
        market_insights: marketInsights,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', newResearch.id);

    if (updateError) {
      console.error("[CORS DEBUG] Error updating research record:", updateError);
      throw new Error(`Failed to update research: ${updateError.message}`);
    }

    console.log(`[CORS DEBUG] Successfully completed research for company ${companyId}`);
    console.log("[CORS DEBUG] Preparing response with CORS headers");

    // Return the research data
    return new Response(
      JSON.stringify({
        success: true,
        researchId: newResearch.id,
        research: {
          text: researchText,
          sources: sources,
          newsHighlights: newsHighlights,
          marketInsights: marketInsights
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("[CORS DEBUG] Error in real-time-perplexity-research function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Helper function to extract URLs from text
function extractSources(text: string): any[] {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const matches = text.match(urlRegex) || [];
  
  // Convert to JSONB compatible format
  return matches.map(url => ({
    url: url.trim().replace(/[.,;:!]$/, '') // Clean up URLs
  }));
}

// Helper function to extract news highlights from text
function extractNewsHighlights(text: string): any[] {
  // Find "LATEST NEWS" section
  const newsSection = text.match(/#+\s*LATEST NEWS[\s\S]*?(?=#+\s*MARKET INSIGHTS|$)/i);
  
  if (!newsSection) return [];
  
  const newsSectionText = newsSection[0];
  
  // Extract news items - look for headlines which are typically after newlines and possibly with markdown formatting
  const newsItems = newsSectionText.split(/\n-|\n\d+\.|\n\*/).slice(1);
  
  return newsItems.map(item => {
    // Extract headline
    const headlineMatch = item.match(/^[^\n]*?([^.\n]+)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : '';
    
    // Extract source/date
    const sourceMatch = item.match(/\(([^)]+)\)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    
    // Extract URL
    const urlMatch = item.match(/(https?:\/\/[^\s)]+)/);
    const url = urlMatch ? urlMatch[0].trim() : '';
    
    // Extract content (everything else)
    let content = item
      .replace(headline, '')
      .replace(sourceMatch ? sourceMatch[0] : '', '')
      .replace(urlMatch ? urlMatch[0] : '', '')
      .trim();
      
    // Clean up content
    content = content.replace(/^[:\s-]+/, '').trim();
    
    return { headline, source, url, content };
  }).filter(item => item.headline); // Filter out empty items
}

// Helper function to extract market insights from text
function extractMarketInsights(text: string): any[] {
  // Find "MARKET INSIGHTS" section
  const insightsSection = text.match(/#+\s*MARKET INSIGHTS[\s\S]*?(?=#+\s*RESEARCH SUMMARY|$)/i);
  
  if (!insightsSection) return [];
  
  const insightsSectionText = insightsSection[0];
  
  // Extract insight items - look for items which are typically after newlines and possibly with markdown formatting
  const insightItems = insightsSectionText.split(/\n-|\n\d+\.|\n\*/).slice(1);
  
  return insightItems.map(item => {
    // Extract title (first sentence or line)
    const titleMatch = item.match(/^[^\n.]*?([^.\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract URL
    const urlMatch = item.match(/(https?:\/\/[^\s)]+)/);
    const url = urlMatch ? urlMatch[0].trim() : '';
    
    // Extract source
    const sourceMatch = item.match(/\(([^)]+)\)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    
    // Extract content (everything else)
    let content = item
      .replace(titleMatch ? titleMatch[0] : '', '')
      .replace(urlMatch ? urlMatch[0] : '', '')
      .replace(sourceMatch ? sourceMatch[0] : '', '')
      .trim();
      
    // Clean up content
    content = content.replace(/^[:\s-]+/, '').trim();
    
    return { title, content, source, url };
  }).filter(item => item.title || item.content); // Filter out empty items
}
