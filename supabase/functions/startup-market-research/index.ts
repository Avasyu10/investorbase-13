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
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission details
    const { data: submission, error: fetchError } = await supabase
      .from('startup_submissions')
      .select('startup_name, user_id')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error('Submission not found');
    }

    // Check if research already exists and is recent (within last 7 days)
    const { data: existingResearch } = await supabase
      .from('startup_market_research')
      .select('*')
      .eq('startup_submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

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

    // Create or update research record
    const { data: researchRecord, error: upsertError } = await supabase
      .from('startup_market_research')
      .upsert({
        startup_submission_id: submissionId,
        status: 'processing',
        requested_at: new Date().toISOString()
      }, {
        onConflict: 'startup_submission_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error creating research record:', upsertError);
    }

    // Build comprehensive prompt
    const prompt = `Conduct comprehensive market research for this startup:

Company: ${submission.startup_name}
${assessmentText ? `\nKey Assessment Points:\n${assessmentText}` : ''}

Provide a detailed analysis covering:

## MARKET SUMMARY
- Current market size and growth trajectory
- Key market drivers and trends
- Target customer segments and needs

## NEWS HIGHLIGHTS
- Recent industry developments (last 6 months)
- Major announcements or events affecting this space
- Relevant policy changes or regulatory updates

## MARKET INSIGHTS
- Competitive landscape and key players
- Market opportunities and white spaces
- Technology trends and innovations
- Potential risks and challenges
- Investment activity and funding trends

Format the response with clear markdown headers (##) and bullet points. Be specific, data-driven, and actionable. Focus on recent (2024-2025) information.`;

    console.log('Calling Perplexity API...');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst providing detailed, data-driven analysis for venture capital evaluation. Focus on recent information and cite sources when possible.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const researchText = data.choices[0].message.content;

    // Extract structured sections
    const sections = {
      summary: extractSection(researchText, 'MARKET SUMMARY'),
      news: extractSection(researchText, 'NEWS HIGHLIGHTS'),
      insights: extractSection(researchText, 'MARKET INSIGHTS')
    };

    // Store the research results
    const { error: updateError } = await supabase
      .from('startup_market_research')
      .update({
        research_text: researchText,
        research_summary: sections.summary,
        news_highlights: parseListItems(sections.news),
        market_insights: parseListItems(sections.insights),
        prompt: prompt,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('startup_submission_id', submissionId);

    if (updateError) {
      console.error('Error updating research:', updateError);
      throw updateError;
    }

    console.log('Research completed successfully');

    return new Response(
      JSON.stringify({
        research: researchText,
        summary: sections.summary,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in startup market research:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`##\\s*${sectionName}([\\s\\S]*?)(?=##|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function parseListItems(text: string): any[] {
  if (!text) return [];
  
  const items = text.split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => {
      const content = line.replace(/^[-•]\s*/, '').trim();
      return {
        headline: content.substring(0, 100),
        content: content
      };
    });

  return items.slice(0, 5);
}
