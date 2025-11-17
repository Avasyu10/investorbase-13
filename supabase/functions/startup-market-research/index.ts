import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { submissionId, assessmentText, forceRefresh } = body;
    
    console.log('[startup-market-research] Request received:', {
      submissionId,
      hasAssessment: !!assessmentText,
      assessmentLength: assessmentText?.length
    });

    if (!submissionId) {
      console.error('[startup-market-research] Missing submission ID');
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    console.log('[startup-market-research] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey
    });

    if (!geminiApiKey) {
      console.error('[startup-market-research] GEMINI_API_KEY not configured');
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission details
    console.log('[startup-market-research] Fetching submission details...');
    const { data: submission, error: fetchError } = await supabase
      .from('startup_submissions')
      .select('startup_name, user_id')
      .eq('id', submissionId)
      .maybeSingle();

    if (fetchError) {
      console.error('[startup-market-research] Error fetching submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }

    if (!submission) {
      console.error('[startup-market-research] Submission not found:', submissionId);
      throw new Error('Submission not found');
    }

    const startupName = submission.startup_name;
    console.log('[startup-market-research] Found startup:', startupName);

    // Check if research already exists and is recent (within last 7 days)
    console.log('[startup-market-research] Checking for existing research...');
    const { data: existingResearch, error: checkError } = await supabase
      .from('startup_market_research')
      .select('*')
      .eq('startup_submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error('[startup-market-research] Error checking existing research:', checkError);
    }

    if (existingResearch && existingResearch.status === 'completed' && !forceRefresh) {
      const daysSinceResearch = (Date.now() - new Date(existingResearch.created_at).getTime()) / (1000 * 60 * 60 * 24);
      console.log('[startup-market-research] Found existing research, age:', daysSinceResearch, 'days');
      if (daysSinceResearch < 7) {
        console.log('[startup-market-research] Returning cached research');
        return new Response(
          JSON.stringify({
            research: existingResearch.research_text,
            summary: existingResearch.research_summary,
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log('[startup-market-research] Generating new research...');

    // Build comprehensive prompt
    const systemInstruction = 'You are a VC analyst conducting market research. Provide factual, data-driven insights with specific sources. Focus on information directly relevant to the startup being evaluated.';
    
    const userPrompt = `Conduct comprehensive market research for ${startupName} based on their evaluation context below.

STARTUP EVALUATION CONTEXT:
${assessmentText || 'No specific assessment points provided'}

YOUR TASK:
Using the evaluation points above as your guide, research and analyze:
1. How the market validates or challenges the startup's approach
2. Competitive dynamics in their specific space
3. Recent developments that impact their opportunity
4. Market data that supports or questions their strategy

OUTPUT FORMAT (STRICT):

# Market Research: ${startupName}

## 1. LATEST NEWS (2023-2024)
Provide 5-7 recent news items directly relevant to this startup's market space and evaluation context. Each must:
- Address specific concerns or opportunities mentioned in the evaluation
- Be a concrete, recent event (not general market facts)
- Include publication, specific date, and URL
- Focus on competitor moves, market shifts, regulatory changes, or funding events

Format:
### [Specific News Event Headline]
**Source:** [Publication Name], [Month Year]
**Summary:** [2-3 sentences on the news and its implications for this startup's space]
**URL:** [actual source URL]

## 2. MARKET INSIGHTS
Provide 5-7 analytical insights that directly address the evaluation points. Each must:
- Connect to specific strengths, weaknesses, or questions from the evaluation
- Include hard data (market size, growth rates, adoption metrics)
- Cite specific market reports, research papers, or analyst opinions
- Provide strategic context for investment decision-making

Format:
### [Insight Title - Tied to Evaluation Point]
**Content:** [3-4 sentences with data, trends, and analysis directly relevant to the startup's strategy]
**Source:** [Report/Research Name], [Date]
**URL:** [source URL]

## 3. RESEARCH SUMMARY
Write 3-4 focused paragraphs that:
- Synthesize how market data validates or challenges the startup's approach
- Highlight key opportunities based on current market dynamics
- Identify risks or competitive threats revealed by the research
- Provide clear investment considerations based on findings

CRITICAL RULES:
1. Every insight must tie back to the evaluation context
2. Use specific numbers, dates, and credible sources
3. Differentiate news (events) from insights (analysis)
4. Focus on 2023-2024 information
5. Be concise and actionable for investment decisions`;

    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    console.log('Calling Gemini API...');
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: fullPrompt }],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const responseData = await geminiResponse.json();
    
    if (!responseData.candidates?.[0]?.content?.parts?.[0]) {
      throw new Error('Invalid response format from Gemini API');
    }

    const researchText = responseData.candidates[0].content.parts[0].text;
    console.log('Research text length:', researchText.length);

    // Extract structured data
    const researchSummary = extractResearchSummary(researchText);
    const sources = extractSources(researchText);
    const newsHighlights = extractNewsHighlights(researchText);
    const marketInsights = extractMarketInsights(researchText);

    console.log('Extracted data:', {
      summaryLength: researchSummary.length,
      sourcesCount: sources.length,
      newsCount: newsHighlights.length,
      insightsCount: marketInsights.length,
    });

    // Store research in database
    const timestamp = new Date().toISOString();
    
    const { data: researchData, error: insertError } = await supabase
      .from('startup_market_research')
      .upsert({
        startup_submission_id: submissionId,
        research_text: researchText,
        research_summary: researchSummary,
        sources: sources,
        news_highlights: newsHighlights,
        market_insights: marketInsights,
        prompt: fullPrompt,
        status: 'completed',
        completed_at: timestamp,
        requested_at: timestamp,
      }, {
        onConflict: 'startup_submission_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[startup-market-research] Error storing research:', insertError);
      throw insertError;
    }

    console.log('[startup-market-research] Research completed and stored successfully');

    return new Response(
      JSON.stringify({
        research: researchText,
        summary: researchSummary,
        sources: sources,
        newsHighlights: newsHighlights,
        marketInsights: marketInsights,
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[startup-market-research] Error:', error);
    console.error('[startup-market-research] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Helper functions to extract structured data from research text

function extractResearchSummary(text: string): string {
  try {
    const researchSummaryRegex = /## 3\.\s*RESEARCH SUMMARY\s*([\s\S]*?)(?=(##|$))/i;
    const match = text.match(researchSummaryRegex);
    
    if (match && match[1]) {
      console.log('Successfully extracted research summary section');
      return match[1].trim();
    }

    const altResearchSummaryRegex = /(?:RESEARCH SUMMARY|Research Summary)[\s\S]*?((?:###[^#]+)+)/i;
    const altMatch = text.match(altResearchSummaryRegex);
    
    if (altMatch && altMatch[1]) {
      console.log('Extracted research summary using alternative pattern');
      return altMatch[1].trim();
    }

    console.log('Could not extract research summary section');
    return '';
  } catch (error) {
    console.error('Error extracting research summary:', error);
    return '';
  }
}

function extractSources(text: string): Array<{ name: string; url: string }> {
  const sources: Array<{ name: string; url: string }> = [];
  const urlRegex = /\*\*URL:\*\* (https?:\/\/[^\s]+)/g;
  
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (url && !sources.some(s => s.url === url)) {
      sources.push({ name: 'Source', url });
    }
  }

  const sourceLines = text.match(/\*\*Source:\*\*.*$/gm) || [];
  for (const line of sourceLines) {
    const sourceName = line.match(/\*\*Source:\*\* ([^(]+)/) || [];
    const urlMatch = line.match(/(https?:\/\/[^\s)]+)(?:\))?$/);
    
    if (urlMatch && urlMatch[1]) {
      const url = urlMatch[1].replace(/\)$/, '');
      if (url && !sources.some(s => s.url === url)) {
        sources.push({
          name: sourceName[1] ? sourceName[1].trim() : 'Source',
          url
        });
      }
    }
  }

  return sources;
}

function extractNewsHighlights(text: string): Array<{
  headline: string;
  content: string;
  source: string;
  url: string;
}> {
  const newsHighlights: Array<{ headline: string; content: string; source: string; url: string }> = [];
  
  const newsRegex = /## 1\. LATEST NEWS[\s\S]*?(?=## 2\.|$)/i;
  const newsSection = text.match(newsRegex);
  
  if (!newsSection) {
    console.log('No LATEST NEWS section found');
    return newsHighlights;
  }

  const newsContent = newsSection[0];
  const newsItemRegex = /### (.*?)(?=### |## 2\.|$)/gs;
  const newsMatches = [...newsContent.matchAll(newsItemRegex)];

  for (const match of newsMatches) {
    if (!match[1] || match[1].trim() === '') continue;

    const newsItem = match[1].trim();
    const headlineMatch = newsItem.match(/^(.*?)(?=\n|$)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : '';
    
    const sourceMatch = newsItem.match(/\*\*Source:\*\* (.*?)(?=\n|$)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    
    const summaryMatch = newsItem.match(/\*\*Summary:\*\* (.*?)(?=\n\*\*URL|$)/s);
    const content = summaryMatch ? summaryMatch[1].trim() : '';
    
    const urlMatch = newsItem.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    if (headline) {
      newsHighlights.push({ headline, content, source, url });
    }
  }

  return newsHighlights;
}

function extractMarketInsights(text: string): Array<{
  headline: string;
  content: string;
  source: string;
  url: string;
}> {
  const marketInsights: Array<{ headline: string; content: string; source: string; url: string }> = [];
  
  const insightsRegex = /## 2\. MARKET INSIGHTS[\s\S]*?(?=## 3\.|$)/i;
  const insightsSection = text.match(insightsRegex);
  
  if (!insightsSection) {
    console.log('No MARKET INSIGHTS section found');
    return marketInsights;
  }

  const insightsContent = insightsSection[0];
  const insightItemRegex = /### (.*?)(?=### |## 3\.|$)/gs;
  const insightMatches = [...insightsContent.matchAll(insightItemRegex)];

  for (const match of insightMatches) {
    if (!match[1] || match[1].trim() === '') continue;

    const insightItem = match[1].trim();
    const headlineMatch = insightItem.match(/^(.*?)(?=\n|$)/);
    const headline = headlineMatch ? headlineMatch[1].trim() : '';
    
    const contentMatch = insightItem.match(/\*\*Content:\*\* (.*?)(?=\n\*\*Source|$)/s);
    const content = contentMatch ? contentMatch[1].trim() : '';
    
    const sourceMatch = insightItem.match(/\*\*Source:\*\* (.*?)(?=\n|$)/);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    
    const urlMatch = insightItem.match(/\*\*URL:\*\* (https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';

    if (headline) {
      marketInsights.push({ headline, content, source, url });
    }
  }

  return marketInsights;
}
