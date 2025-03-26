
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, applyCorsHeaders, corsHeaders } from "./cors.ts";

serve(async (req) => {
  console.log(`[DEBUG] Received ${req.method} request to ${req.url}`);
  
  try {
    // Check if it's a CORS preflight request and handle it early if so
    const corsResponse = handleCors(req);
    if (corsResponse) {
      console.log(`[DEBUG] Returning early with CORS response for OPTIONS request`);
      return corsResponse;
    }
    
    // Get Perplexity API key from environment
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[DEBUG] Missing PERPLEXITY_API_KEY');
      const errorResponse = new Response(
        JSON.stringify({ success: false, error: 'PERPLEXITY_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    // Parse request
    let requestData;
    try {
      requestData = await req.json();
      console.log(`[DEBUG] Successfully parsed request JSON:`, JSON.stringify(requestData));
    } catch (parseError) {
      console.error('[DEBUG] Failed to parse request JSON:', parseError);
      const errorResponse = new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }
    
    const { companyId, assessmentPoints } = requestData;
    
    if (!companyId || !assessmentPoints || !Array.isArray(assessmentPoints) || assessmentPoints.length === 0) {
      console.error('[DEBUG] Invalid request data', { 
        companyId, 
        assessmentPointsProvided: !!assessmentPoints,
        isArray: Array.isArray(assessmentPoints),
        length: assessmentPoints?.length 
      });
      
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request. Expected companyId and non-empty assessmentPoints array' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    console.log(`[DEBUG] Processing research request for company ${companyId}`);
    
    // Create the Supabase client for database operations
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[DEBUG] Missing Supabase credentials:', {
        url: !!SUPABASE_URL,
        key: !!SUPABASE_SERVICE_ROLE_KEY
      });
      
      const errorResponse = new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase credentials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }
    
    // Create a Supabase client with the service role key
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    console.log('[DEBUG] Successfully imported Supabase client');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('[DEBUG] Successfully created Supabase client');

    // Get company info to include in the prompt
    let companyData;
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (error) {
        console.error('[DEBUG] Error fetching company:', error);
        throw new Error(`Failed to fetch company: ${error.message}`);
      }
      
      companyData = data;
      console.log('[DEBUG] Successfully fetched company data:', companyData);
    } catch (dbError) {
      console.error('[DEBUG] Database error when fetching company:', dbError);
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: dbError instanceof Error ? dbError.message : "Unknown database error" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    const companyName = companyData?.name || 'the company';
    const assessmentText = assessmentPoints.join("\n\n");

    // Create a new research record in the database with pending status
    let newResearch;
    try {
      const { data, error } = await supabase
        .from('market_research')
        .insert({
          company_id: companyId,
          prompt: assessmentText,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[DEBUG] Error creating research record:', error);
        throw new Error(`Failed to create research record: ${error.message}`);
      }
      
      newResearch = data;
      console.log('[DEBUG] Successfully created research record:', newResearch?.id);
    } catch (insertError) {
      console.error('[DEBUG] Database error when creating research record:', insertError);
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: insertError instanceof Error ? insertError.message : "Unknown database error" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
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

    console.log("[DEBUG] Sending request to Perplexity API");
    
    // Call Perplexity API
    let perplexityResponse;
    try {
      perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
      
      console.log("[DEBUG] Received response from Perplexity API with status:", perplexityResponse.status);
    } catch (fetchError) {
      console.error("[DEBUG] Error fetching from Perplexity API:", fetchError);
      
      // Update the research record with error status
      try {
        await supabase
          .from('market_research')
          .update({
            status: 'failed',
            error_message: `Perplexity API fetch error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
          })
          .eq('id', newResearch.id);
      } catch (updateError) {
        console.error("[DEBUG] Also failed to update research record with error status:", updateError);
      }
      
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: fetchError instanceof Error ? fetchError.message : "Failed to fetch from Perplexity API" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    // Check for errors
    if (!perplexityResponse.ok) {
      let errorText;
      try {
        errorText = await perplexityResponse.text();
      } catch (e) {
        errorText = `Could not read error response: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
      
      console.error(`[DEBUG] Perplexity API error (${perplexityResponse.status}):`, errorText);
      
      // Update the research record with error status
      try {
        await supabase
          .from('market_research')
          .update({
            status: 'failed',
            error_message: `Perplexity API error: ${perplexityResponse.status} - ${errorText}`,
          })
          .eq('id', newResearch.id);
      } catch (updateError) {
        console.error("[DEBUG] Failed to update research record with error status:", updateError);
      }
      
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: `Perplexity API error: ${perplexityResponse.status} - ${errorText}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    // Process the response
    let responseData;
    try {
      responseData = await perplexityResponse.json();
      console.log("[DEBUG] Successfully parsed Perplexity API JSON response");
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse Perplexity API response:", parseError);
      
      // Update the research record with error status
      try {
        await supabase
          .from('market_research')
          .update({
            status: 'failed',
            error_message: `Failed to parse Perplexity API response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          })
          .eq('id', newResearch.id);
      } catch (updateError) {
        console.error("[DEBUG] Failed to update research record with error status:", updateError);
      }
      
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to parse Perplexity API response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("[DEBUG] Invalid response format from Perplexity:", responseData);
      
      // Update the research record with error status
      try {
        await supabase
          .from('market_research')
          .update({
            status: 'failed',
            error_message: "Invalid response format from Perplexity API",
          })
          .eq('id', newResearch.id);
      } catch (updateError) {
        console.error("[DEBUG] Failed to update research record with error status:", updateError);
      }
      
      const errorResponse = new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid response format from Perplexity API" 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
      return applyCorsHeaders(errorResponse);
    }

    const researchText = responseData.choices[0].message.content;
    console.log("[DEBUG] Successfully extracted research text from Perplexity response");
    
    // Extract sources, news highlights, and market insights from the research text
    try {
      const sources = extractSources(researchText);
      const newsHighlights = extractNewsHighlights(researchText);
      const marketInsights = extractMarketInsights(researchText);
      
      console.log("[DEBUG] Successfully extracted metadata from research text", {
        sourcesCount: sources.length,
        newsHighlightsCount: newsHighlights.length,
        marketInsightsCount: marketInsights.length
      });
      
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
        console.error("[DEBUG] Error updating research record:", updateError);
        throw new Error(`Failed to update research: ${updateError.message}`);
      }
      
      console.log(`[DEBUG] Successfully completed research for company ${companyId}`);

      // Return the research data with CORS headers
      const successResponse = new Response(
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
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 200
        }
      );
      
      console.log("[DEBUG] Successfully prepared success response, returning to client");
      return successResponse;
    } catch (error) {
      console.error("[DEBUG] Error in final processing:", error);
      const errorResponse = new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error in final processing"
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 500
        }
      );
      return errorResponse;
    }
  } catch (error) {
    console.error("[DEBUG] Unhandled error in real-time-perplexity-research function:", error);
    const errorResponse = new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500
      }
    );
    return errorResponse;
  }
});

// Helper function to extract URLs from text
function extractSources(text: string): any[] {
  console.log("[DEBUG] Extracting sources from research text");
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const matches = text.match(urlRegex) || [];
  
  // Convert to JSONB compatible format
  return matches.map(url => ({
    url: url.trim().replace(/[.,;:!]$/, '') // Clean up URLs
  }));
}

// Helper function to extract news highlights from text
function extractNewsHighlights(text: string): any[] {
  console.log("[DEBUG] Extracting news highlights from research text");
  // Find "LATEST NEWS" section
  const newsSection = text.match(/#+\s*LATEST NEWS[\s\S]*?(?=#+\s*MARKET INSIGHTS|$)/i);
  
  if (!newsSection) {
    console.log("[DEBUG] No LATEST NEWS section found in research text");
    return [];
  }
  
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
  console.log("[DEBUG] Extracting market insights from research text");
  // Find "MARKET INSIGHTS" section
  const insightsSection = text.match(/#+\s*MARKET INSIGHTS[\s\S]*?(?=#+\s*RESEARCH SUMMARY|$)/i);
  
  if (!insightsSection) {
    console.log("[DEBUG] No MARKET INSIGHTS section found in research text");
    return [];
  }
  
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
