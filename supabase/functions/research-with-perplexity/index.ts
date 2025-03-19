
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Perplexity API key from environment
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Parse request
    const { companyId, assessmentText } = await req.json();
    
    if (!companyId || !assessmentText || typeof assessmentText !== 'string') {
      throw new Error('Invalid request. Expected companyId and assessmentText');
    }

    console.log(`Processing research request for company ${companyId}`);
    
    // Create prompt for Perplexity
    const prompt = `You are a top-tier financial journalist specializing in market research. I need you to provide the latest 2023-2024 market news, analysis, and insights relevant to a startup with the following assessment:

${assessmentText}

Format each insight like a NEWS ARTICLE with:
1. A compelling headline (make it specific and directly related to this company's business model)
2. Publication information in parentheses (e.g., "Bloomberg, June 2024")
3. 2-3 concise sentences with concrete facts, figures, and insights DIRECTLY APPLICABLE to this specific company
4. ALWAYS include a URL to a real, reputable news source at the end

Focus on these categories and provide EXACTLY ONE article for each:
- Market Size & Growth: Latest projections with SPECIFIC numbers and growth percentages directly relevant to this company
- Recent Funding: Notable investment rounds or acquisitions in this exact sector (past 6 months)
- Market Trends: Emerging patterns that will specifically impact this business (use data points)
- Regulatory Updates: Recent policy changes directly affecting this industry
- Industry Challenges: Obstacles reported by similar companies in this specific market

Each news item should be formatted with a ### prefix, like:
### [COMPELLING HEADLINE SPECIFIC TO THIS COMPANY]
(Publication Name, Date) Key insights with concrete facts and figures RELEVANT TO THIS COMPANY. More specific details about how this directly impacts this business. Additional context about why this particularly matters to this company's strategy.
Source: [URL]

Provide exactly 5 diverse articles total, one per category. Make each headline unique and insightful. Focus on RECENT, FACTUAL data that would be valuable to investors assessing THIS SPECIFIC COMPANY.`;

    console.log("Sending request to Perplexity API");
    
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
            content: 'You are a financial journalist writing market research news articles. Provide factual, recent insights with specific data points from reliable sources. Focus exclusively on information directly relevant to the company being analyzed.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 1200,
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
      console.error(`Perplexity API error (${perplexityResponse.status}):`, errorText);
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`);
    }

    // Process the response
    const responseData = await perplexityResponse.json();
    console.log("Received response from Perplexity API");
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error("Invalid response format from Perplexity:", responseData);
      throw new Error("Invalid response format from Perplexity API");
    }

    const researchText = responseData.choices[0].message.content;
    
    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }
    
    // Create Supabase client with admin rights
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    // Create a Supabase client with the service role key
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, verify that the user owns this company
    const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    
    // Get the user ID
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized: Unable to get user information');
    }
    
    // Verify company ownership
    const { data: companyData, error: companyError } = await clientSupabase
      .from('companies')
      .select('id, user_id')
      .eq('id', companyId)
      .single();
      
    if (companyError || !companyData) {
      throw new Error('Company not found or access denied');
    }
    
    // Update the company record with the Perplexity data
    const { error: updateError } = await adminSupabase
      .from('companies')
      .update({
        perplexity_prompt: prompt,
        perplexity_response: researchText,
        perplexity_requested_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .eq('user_id', user.id); // Ensure user can only update their own companies

    if (updateError) {
      console.error("Error updating company record:", updateError);
      throw new Error(`Failed to update company: ${updateError.message}`);
    }

    console.log(`Successfully updated company ${companyId} with research data`);

    // Return the research data
    return new Response(
      JSON.stringify({
        success: true,
        research: researchText,
        prompt: prompt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in research-with-perplexity function:", error);
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
