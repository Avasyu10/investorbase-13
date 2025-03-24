
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
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

    // First check if analysis already exists in the database
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    const existingAnalysisResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis?company_id=eq.${company_id}&user_id=eq.${user_id}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    
    const existingAnalysis = await existingAnalysisResponse.json();
    
    if (existingAnalysis && existingAnalysis.length > 0) {
      // Return existing analysis
      return new Response(
        JSON.stringify({ 
          analysis: existingAnalysis[0].analysis_text,
          prompt_sent: existingAnalysis[0].prompt_sent,
          response_received: existingAnalysis[0].response_received
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Fetch the fund thesis and pitch deck documents
    const fundThesisResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
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
        'Authorization': authHeader,
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

    // Prepare the prompt for Gemini
    const promptText = `You are an expert venture capital analyst. Analyze how well the pitch deck aligns with the fund thesis. 
                Provide your analysis in exactly the following format with these three sections ONLY:
                
                1. Overall Summary - A concise evaluation of the overall alignment
                2. Key Similarities - The main points where the pitch deck aligns with the fund thesis
                3. Key Differences - The main areas where the pitch deck diverges from the fund thesis
                
                Fund Thesis PDF Content:
                ${fundThesisBase64}

                Pitch Deck PDF Content:
                ${pitchDeckBase64}`;

    // Call Gemini to analyze alignment
    const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const urlWithApiKey = `${geminiEndpoint}?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(urlWithApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      }),
    });

    const geminiData = await geminiResponse.json();
    let analysisText = '';
    let rawResponse = '';
    
    if (geminiData.candidates && geminiData.candidates.length > 0 && 
        geminiData.candidates[0].content && geminiData.candidates[0].content.parts && 
        geminiData.candidates[0].content.parts.length > 0) {
      analysisText = geminiData.candidates[0].content.parts[0].text;
      rawResponse = JSON.stringify(geminiData);
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }

    // Store analysis in Supabase
    const supabaseStoreResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        company_id,
        user_id,
        analysis_text: analysisText,
        prompt_sent: promptText,
        response_received: rawResponse
      })
    });

    const storedAnalysis = await supabaseStoreResponse.json();

    return new Response(JSON.stringify({ 
      analysis: analysisText,
      prompt_sent: promptText,
      response_received: rawResponse,
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
