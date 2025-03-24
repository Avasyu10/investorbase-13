
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    const { company_id, user_id } = await req.json();

    // Validate input
    if (!company_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Company ID and User ID are required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Fetch the fund thesis and pitch deck documents
    const fundThesisResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'download', 
        userId: user_id,
        documentType: 'fund_thesis' 
      })
    });

    const pitchDeckResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'download', 
        companyId: company_id 
      })
    });

    const fundThesisBlob = await fundThesisResponse.blob();
    const pitchDeckBlob = await pitchDeckResponse.blob();

    // Convert blobs to base64
    const fundThesisBase64 = await blobToBase64(fundThesisBlob);
    const pitchDeckBase64 = await blobToBase64(pitchDeckBlob);

    // Call OpenAI to analyze alignment
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are an expert venture capital analyst. Analyze how well the pitch deck aligns with the fund thesis. 
            Provide a detailed assessment focusing on key alignment points, potential synergies, and any notable discrepancies.
            Your response should be structured and actionable.` 
          },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: 'Fund Thesis PDF:' 
              },
              { 
                type: 'text', 
                text: fundThesisBase64 
              },
              { 
                type: 'text', 
                text: 'Pitch Deck PDF:' 
              },
              { 
                type: 'text', 
                text: pitchDeckBase64 
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    const analysisData = await openAIResponse.json();
    const analysisText = analysisData.choices[0].message.content;

    // Store analysis in Supabase
    const supabaseStoreResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        company_id,
        user_id,
        analysis_text: analysisText
      })
    });

    const storedAnalysis = await supabaseStoreResponse.json();

    return new Response(JSON.stringify({ 
      analysis: analysisText,
      storedAnalysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in fund thesis alignment analysis:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Utility function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
