
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";

// Define CORS headers
serve(async (req) => {
  // Log the request details for debugging
  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, JSON.stringify(Object.fromEntries(req.headers.entries())));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData));
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { company_id, user_id } = requestData;

    // Validate input
    if (!company_id || !user_id) {
      console.error('Missing required parameters:', { company_id, user_id });
      return new Response(
        JSON.stringify({ error: 'Company ID and User ID are required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // First check if analysis already exists in the database
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }
    
    console.log('Checking for existing analysis in database');
    const existingAnalysisResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis?company_id=eq.${company_id}&user_id=eq.${user_id}`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });
    
    if (!existingAnalysisResponse.ok) {
      console.error('Error fetching existing analysis:', await existingAnalysisResponse.text());
      throw new Error(`Error checking for existing analysis: ${existingAnalysisResponse.status}`);
    }
    
    const existingAnalysis = await existingAnalysisResponse.json();
    
    if (existingAnalysis && existingAnalysis.length > 0) {
      // Return existing analysis
      console.log('Found existing analysis, returning it');
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

    console.log('No existing analysis found, creating new one');

    // Fetch the fund thesis document
    console.log('Fetching fund thesis document');
    const fundThesisResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY as string
      },
      body: JSON.stringify({ 
        action: 'download', 
        userId: user_id,
        documentType: 'fund_thesis' 
      })
    });

    if (!fundThesisResponse.ok) {
      const errorText = await fundThesisResponse.text();
      console.error('Failed to fetch fund thesis:', errorText);
      throw new Error(`Failed to fetch fund thesis: ${fundThesisResponse.status} - ${errorText}`);
    }

    console.log('Fetching pitch deck document');
    const pitchDeckResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY as string
      },
      body: JSON.stringify({ 
        action: 'download', 
        companyId: company_id 
      })
    });

    if (!pitchDeckResponse.ok) {
      const errorText = await pitchDeckResponse.text();
      console.error('Failed to fetch pitch deck:', errorText);
      throw new Error(`Failed to fetch pitch deck: ${pitchDeckResponse.status} - ${errorText}`);
    }

    const fundThesisBlob = await fundThesisResponse.blob();
    const pitchDeckBlob = await pitchDeckResponse.blob();

    console.log(`Fund thesis size: ${fundThesisBlob.size} bytes`);
    console.log(`Pitch deck size: ${pitchDeckBlob.size} bytes`);

    if (fundThesisBlob.size === 0) {
      throw new Error('Fund thesis document is empty');
    }

    if (pitchDeckBlob.size === 0) {
      throw new Error('Pitch deck document is empty');
    }

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

    console.log('Calling Gemini API to analyze alignment');
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Received response from Gemini API');
    
    let analysisText = '';
    let rawResponse = '';
    
    if (geminiData.candidates && geminiData.candidates.length > 0 && 
        geminiData.candidates[0].content && geminiData.candidates[0].content.parts && 
        geminiData.candidates[0].content.parts.length > 0) {
      analysisText = geminiData.candidates[0].content.parts[0].text;
      rawResponse = JSON.stringify(geminiData);
      console.log('Analysis text length:', analysisText.length);
      console.log('Analysis text sample:', analysisText.substring(0, 200));
    } else {
      console.error('Unexpected response format from Gemini API:', JSON.stringify(geminiData));
      throw new Error('Unexpected response format from Gemini API');
    }

    // Store analysis in Supabase
    console.log('Storing analysis in Supabase');
    const supabaseStoreResponse = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
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

    if (!supabaseStoreResponse.ok) {
      const errorText = await supabaseStoreResponse.text();
      console.error('Failed to store analysis:', errorText);
      throw new Error(`Failed to store analysis: ${supabaseStoreResponse.status} - ${errorText}`);
    }

    const storedAnalysis = await supabaseStoreResponse.json();
    console.log('Analysis stored successfully');

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
