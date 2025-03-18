
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
    const prompt = `You are a sophisticated VC research analyst. I need you to provide the latest 2023-2024 and 2024-2025 market research, news articles, funding data, and industry insights relevant to a startup with the following assessment:

${assessmentText}

Focus on:
1. Latest market size and growth projections for this sector (with exact figures)
2. Recent competitor funding rounds or acquisitions in the last 6 months
3. Emerging market trends that might impact this business
4. Recent regulatory changes that could affect this sector
5. Key industry challenges reported in 2024 or 2025

Format each insight with a title, the source information (publication name and date), and a brief summary of the findings. Include URLs to sources where possible. Each insight should be 2-3 sentences maximum.

Provide at least 5-7 different research points from different sources. Focus on FACTUAL DATA rather than opinions, with SPECIFIC NUMBERS AND FIGURES wherever possible.`;

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
            content: 'You are a VC research analyst. Provide factual, recent market insights with specific data points from reliable sources. Include source URLs where possible.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        search_domain_filter: ["perplexity.ai"],
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

    // Update the company record with the Perplexity data
    const { error: updateError } = await adminSupabase
      .from('companies')
      .update({
        perplexity_prompt: prompt,
        perplexity_response: researchText,
        perplexity_requested_at: new Date().toISOString()
      })
      .eq('id', companyId);

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
