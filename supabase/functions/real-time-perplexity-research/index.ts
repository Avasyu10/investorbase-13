
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "./cors.ts";

serve(async (req) => {
  console.log(`[DEBUG] Request received: ${req.method} ${req.url}`);
  console.log(`[DEBUG] Request headers:`, Object.fromEntries([...req.headers.entries()]));
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get Perplexity API key from environment
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[DEBUG] Missing PERPLEXITY_API_KEY');
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Parse request
    const requestData = await req.json();
    console.log(`[DEBUG] Request data:`, JSON.stringify(requestData));
    
    const { companyId, assessmentPoints } = requestData;
    
    if (!companyId || !assessmentPoints || !Array.isArray(assessmentPoints) || assessmentPoints.length === 0) {
      console.error('[DEBUG] Invalid request data', { companyId, assessmentPointsLength: assessmentPoints?.length });
      throw new Error('Invalid request. Expected companyId and non-empty assessmentPoints array');
    }

    console.log(`[DEBUG] Processing research request for company ${companyId}`);
    
    // Create the Supabase client for database operations
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[DEBUG] Missing Supabase credentials');
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
      console.error('[DEBUG] Error fetching company:', companyError);
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
      console.error('[DEBUG] Error creating research record:', insertError);
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

    console.log("[DEBUG] Sending request to Perplexity API");
    console.log("[DEBUG] Prompt:", prompt.substring(0, 200) + "...");
    
    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "sonar-pro",
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
        search_recency_filter: "month",
        frequency_penalty: 1,
        presence_penalty: 0,
        return_images: false,
        return_related_questions: false
      })
    });

    // Check for errors
    console.log(`[DEBUG] Perplexity API response status: ${perplexityResponse.status}`);
    
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`[DEBUG] Perplexity API error (${perplexityResponse.status}):`, errorText);
      
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
    console.log("[DEBUG] Received response from Perplexity API");
    console.log("[DEBUG] Response structure:", JSON.stringify(Object.keys(responseData)));
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("[DEBUG] Invalid response format from Perplexity:", responseData);
      
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
    console.log("[DEBUG] Research text length:", researchText.length);
    console.log("[DEBUG] Research text preview:", researchText.substring(0, 200) + "...");
    
    // Extract sources, news highlights, and market insights from the research text
    const sources = extractSources(researchText);
    const newsHighlights = extractNewsHighlights(researchText);
    const marketInsights = extractMarketInsights(researchText);
    
    console.log("[DEBUG] Extracted sources count:", sources.length);
    console.log("[DEBUG] Extracted news highlights count:", newsHighlights.length);
    console.log("[DEBUG] Extracted market insights count:", marketInsights.length);
    
    // Log the data being inserted for debugging
    console.log("[DEBUG] News highlights sample:", newsHighlights.length > 0 ? JSON.stringify(newsHighlights[0]) : "none");
    console.log("[DEBUG] Market insights sample:", marketInsights.length > 0 ? JSON.stringify(marketInsights[0]) : "none");
    
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
    console.log("[DEBUG] Preparing response with CORS headers");

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
    console.error("[DEBUG] Error in real-time-perplexity-research function:", error);
    console.error("[DEBUG] Error stack:", error.stack);
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
  console.log("[DEBUG] Extracting sources");
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const matches = text.match(urlRegex) || [];
  
  // Convert to JSONB compatible format
  return matches.map(url => ({
    url: url.trim().replace(/[.,;:!]$/, '') // Clean up URLs
  }));
}

// Helper function to extract news highlights from text
function extractNewsHighlights(text: string): any[] {
  console.log("[DEBUG] Extracting news highlights");
  
  // Find "LATEST NEWS" section
  const newsSectionRegex = /#+\s*LATEST NEWS[\s\S]*?(?=#+\s*MARKET INSIGHTS|$)/i;
  const newsSectionMatch = text.match(newsSectionRegex);
  
  if (!newsSectionMatch) {
    console.log("[DEBUG] No LATEST NEWS section found");
    return [];
  }
  
  const newsSectionText = newsSectionMatch[0];
  console.log("[DEBUG] Found LATEST NEWS section, length:", newsSectionText.length);
  
  // Extract individual news items - look for headlines which typically start with ### or after newlines with bullet points
  const newsItemsRegex = /###\s*([^\n]+)[\s\S]*?(?=###|$)|(?:^|\n)[-*•]\s*([^\n]+)[\s\S]*?(?=\n[-*•]|\n##|$)/gm;
  const newsItemsMatches = [...newsSectionText.matchAll(newsItemsRegex)];
  
  console.log("[DEBUG] Found", newsItemsMatches.length, "news item matches");
  
  if (newsItemsMatches.length === 0) {
    // Alternative approach: split by newlines and look for patterns
    const lines = newsSectionText.split('\n').filter(line => line.trim());
    const newsItems = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for headlines (typically in bold or after bullet points or numbers)
      if (line.startsWith('**') || line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
        const headline = line.replace(/^[-*•\d.]\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
        
        // Collect the next few lines as content until we hit another potential headline
        let j = i + 1;
        let content = '';
        let source = '';
        let url = '';
        
        while (j < lines.length && 
              !lines[j].match(/^[-*•]\s+/) && 
              !lines[j].match(/^\d+\.\s+/) && 
              !lines[j].startsWith('**') &&
              !lines[j].startsWith('#')) {
          
          // Check for source/publication
          if (lines[j].includes('(') && lines[j].includes(')')) {
            const sourceMatch = lines[j].match(/\(([^)]+)\)/);
            if (sourceMatch) source = sourceMatch[1].trim();
          }
          
          // Check for URL
          const urlMatch = lines[j].match(/(https?:\/\/[^\s)]+)/);
          if (urlMatch) url = urlMatch[0].trim();
          
          content += lines[j] + ' ';
          j++;
        }
        
        // Add to news items if we have at least a headline
        if (headline) {
          newsItems.push({
            headline,
            content: content.trim(),
            source,
            url
          });
        }
        
        // Skip processed lines
        i = j - 1;
      }
    }
    
    console.log("[DEBUG] Alternative extraction found", newsItems.length, "news items");
    return newsItems;
  }
  
  return newsItemsMatches.map(match => {
    // Get the headline from the captured group
    const headline = (match[1] || match[2] || '').trim();
    
    // Get the full match text
    const itemText = match[0];
    
    // Extract source/publication (typically in parentheses)
    const sourceMatch = itemText.match(/\*\*(?:Source|Publication):\*\*\s*([^(]*\([^)]*\)[^\n]*)|(\([^)]+\))/i);
    const source = sourceMatch ? sourceMatch[1] || sourceMatch[2] : '';
    
    // Extract URL
    const urlMatch = itemText.match(/(https?:\/\/[^\s)]+)/);
    const url = urlMatch ? urlMatch[0].trim() : '';
    
    // Extract content (everything else, removing the headline, source, and URL)
    let content = itemText
      .replace(headline, '')
      .replace(sourceMatch ? sourceMatch[0] : '', '')
      .replace(urlMatch ? urlMatch[0] : '', '')
      .trim();
      
    // Clean up markdown and other formatting
    content = content.replace(/^\s*[-*•]\s+/, '').replace(/\*\*/g, '').trim();
    
    return {
      headline,
      content,
      source: source.replace(/^\(|\)$/g, '').trim(), // Remove surrounding parentheses
      url
    };
  }).filter(item => item.headline); // Filter out items without headlines
}

// Helper function to extract market insights from text
function extractMarketInsights(text: string): any[] {
  console.log("[DEBUG] Extracting market insights");
  
  // Find "MARKET INSIGHTS" section
  const insightsSectionRegex = /#+\s*MARKET INSIGHTS[\s\S]*?(?=#+\s*RESEARCH SUMMARY|$)/i;
  const insightsSectionMatch = text.match(insightsSectionRegex);
  
  if (!insightsSectionMatch) {
    console.log("[DEBUG] No MARKET INSIGHTS section found");
    return [];
  }
  
  const insightsSectionText = insightsSectionMatch[0];
  console.log("[DEBUG] Found MARKET INSIGHTS section, length:", insightsSectionText.length);
  
  // Extract individual insight items - similar approach as news items
  const insightItemsRegex = /###\s*([^\n]+)[\s\S]*?(?=###|$)|(?:^|\n)[-*•]\s*([^\n]+)[\s\S]*?(?=\n[-*•]|\n##|$)/gm;
  const insightItemsMatches = [...insightsSectionText.matchAll(insightItemsRegex)];
  
  console.log("[DEBUG] Found", insightItemsMatches.length, "insight item matches");
  
  if (insightItemsMatches.length === 0) {
    // Alternative approach: split by newlines and look for patterns
    const lines = insightsSectionText.split('\n').filter(line => line.trim());
    const insights = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for titles (typically in bold or after bullet points or numbers)
      if (line.startsWith('**') || line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
        const title = line.replace(/^[-*•\d.]\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
        
        // Collect the next few lines as content until we hit another potential title
        let j = i + 1;
        let content = '';
        let source = '';
        let url = '';
        
        while (j < lines.length && 
              !lines[j].match(/^[-*•]\s+/) && 
              !lines[j].match(/^\d+\.\s+/) && 
              !lines[j].startsWith('**') &&
              !lines[j].startsWith('#')) {
          
          // Check for source/publication
          if (lines[j].includes('(') && lines[j].includes(')')) {
            const sourceMatch = lines[j].match(/\(([^)]+)\)/);
            if (sourceMatch) source = sourceMatch[1].trim();
          }
          
          // Check for URL
          const urlMatch = lines[j].match(/(https?:\/\/[^\s)]+)/);
          if (urlMatch) url = urlMatch[0].trim();
          
          content += lines[j] + ' ';
          j++;
        }
        
        // Add to insights if we have at least a title
        if (title) {
          insights.push({
            title,
            content: content.trim(),
            source,
            url
          });
        }
        
        // Skip processed lines
        i = j - 1;
      }
    }
    
    console.log("[DEBUG] Alternative extraction found", insights.length, "market insights");
    return insights;
  }
  
  return insightItemsMatches.map(match => {
    // Get the title from the captured group
    const title = (match[1] || match[2] || '').trim();
    
    // Get the full match text
    const itemText = match[0];
    
    // Extract source (typically in parentheses)
    const sourceMatch = itemText.match(/\*\*(?:Source):\*\*\s*([^(]*\([^)]*\)[^\n]*)|(\([^)]+\))/i);
    const source = sourceMatch ? sourceMatch[1] || sourceMatch[2] : '';
    
    // Extract URL
    const urlMatch = itemText.match(/(https?:\/\/[^\s)]+)/);
    const url = urlMatch ? urlMatch[0].trim() : '';
    
    // Extract content (everything else, removing the title, source, and URL)
    let content = itemText
      .replace(title, '')
      .replace(sourceMatch ? sourceMatch[0] : '', '')
      .replace(urlMatch ? urlMatch[0] : '', '')
      .trim();
      
    // Clean up markdown and other formatting
    content = content.replace(/^\s*[-*•]\s+/, '').replace(/\*\*/g, '').trim();
    
    return {
      title,
      content,
      source: source.replace(/^\(|\)$/g, '').trim(), // Remove surrounding parentheses
      url
    };
  }).filter(item => item.title); // Filter out items without titles
}
