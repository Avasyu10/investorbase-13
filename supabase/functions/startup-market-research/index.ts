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
    const { submissionId, assessmentText } = await req.json();
    console.log('Processing startup market research for submission:', submissionId);

    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission details
    const { data: submission, error: fetchError } = await supabase
      .from('startup_submissions')
      .select('startup_name, user_id')
      .eq('id', submissionId)
      .maybeSingle();

    if (fetchError || !submission) {
      throw new Error('Submission not found');
    }

    const startupName = submission.startup_name;

    // Check if research already exists and is recent (within last 7 days)
    const { data: existingResearch } = await supabase
      .from('startup_market_research')
      .select('*')
      .eq('startup_submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingResearch && existingResearch.status === 'completed') {
      const daysSinceResearch = (Date.now() - new Date(existingResearch.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceResearch < 7) {
        console.log('Recent research exists, returning cached data');
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

    // Build comprehensive prompt
    const systemInstruction = 'You are a financial analyst specializing in market research. Provide factual, recent information with specific data points. Always include source URLs.';
    
    const userPrompt = `You are a top-tier venture capital (VC) analyst providing comprehensive research about ${startupName}. Based on the following assessment of the startup, I need you to conduct deep market research and provide detailed analysis focusing on the LATEST and MOST RELEVANT market information.

Company Assessment Points:
${assessmentText || 'No specific assessment points provided'}

YOUR RESEARCH SHOULD BE IN THIS FORMAT ONLY, THIS IS THE MOST IMPORTANT PART IN FORMATTING YOUR RESPONSE. ALSO STRICTLY ADHERE TO THE FORMAT INSIDE EACH SECTION:

# Market Research: ${startupName}

## 1. LATEST NEWS (2023-2024)
Provide 6-8 recent news articles that focus ONLY on breaking industry news, recent events, and current developments directly relevant to this startup's market. Each article MUST:
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
- Be based on industry reports, market research, and expert analysis
- Include URLs to credible sources (market reports, analyst blogs, research papers)
- Analyze market opportunities, challenges, or strategic implications

Format each insight as:
### [ANALYTICAL INSIGHT TITLE - MUST BE DIFFERENT FROM NEWS]
**Content:** [3-4 SENTENCES WITH MARKET ANALYSIS, SPECIFIC DATA, AND TRENDS]
**Source:** [SOURCE NAME], [DATE]
**URL:** [SOURCE URL]

## 3. RESEARCH SUMMARY
Create a comprehensive strategic summary (4-6 paragraphs) that synthesizes all findings:
- Market positioning and competitive landscape
- Key opportunities and risks
- Growth drivers and market dynamics
- Investment considerations and outlook

CRITICAL FORMATTING RULES:
1. Each news item and insight MUST have a valid URL
2. Each section must have unique, non-overlapping content
3. Use markdown formatting exactly as shown
4. Focus on 2023-2024 information only
5. Be specific with dates, numbers, and sources
6. News section = EVENTS, Insights section = ANALYSIS`;

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
      console.error('Error storing research:', insertError);
      throw insertError;
    }

    console.log('Research completed successfully');

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
    console.error('Error in startup market research:', error);
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
