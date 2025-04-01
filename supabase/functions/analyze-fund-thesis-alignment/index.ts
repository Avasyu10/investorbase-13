
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
        'apikey': SUPABASE_ANON_KEY as string,
        'x-app-version': '1.0.0'
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
      
      return new Response(
        JSON.stringify({ 
          error: 'Could not fetch fund thesis document',
          details: errorText
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Fetch the pitch deck document - Use the reports table to find the pitch deck
    console.log('Fetching company report data to locate pitch deck');
    const reportsResponse = await fetch(`${SUPABASE_URL}/rest/v1/reports?company_id=eq.${company_id}&select=id,pdf_url,user_id`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });

    if (!reportsResponse.ok) {
      const errorText = await reportsResponse.text();
      console.error('Failed to fetch company reports:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Could not fetch company reports',
          details: errorText
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const reports = await reportsResponse.json();
    if (!reports || reports.length === 0) {
      console.error('No reports found for company:', company_id);
      return new Response(
        JSON.stringify({ 
          error: 'No reports found for this company',
          details: 'Company does not have any associated reports'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('Found reports for company:', reports);
    const report = reports[0]; // Use the first report
    
    // Now fetch the actual pitch deck PDF using the report data
    console.log('Fetching pitch deck document using report data');
    const pitchDeckResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/report_pdfs/${report.user_id}/${report.pdf_url}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });

    if (!pitchDeckResponse.ok) {
      const errorText = await pitchDeckResponse.text();
      console.error('Failed to fetch pitch deck directly:', errorText);
      
      // Try the handle-vc-document-upload function as a fallback
      console.log('Trying alternative method to fetch pitch deck');
      const altPitchDeckResponse = await fetch(`${SUPABASE_URL}/functions/v1/handle-vc-document-upload`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY as string,
          'x-app-version': '1.0.0'
        },
        body: JSON.stringify({ 
          action: 'download', 
          companyId: company_id 
        })
      });
      
      if (!altPitchDeckResponse.ok) {
        const altErrorText = await altPitchDeckResponse.text();
        console.error('Failed to fetch pitch deck with alternative method:', altErrorText);
        return new Response(
          JSON.stringify({ 
            error: 'Could not fetch company pitch deck',
            details: altErrorText
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404
          }
        );
      }
      
      const fundThesisBlob = await fundThesisResponse.blob();
      const pitchDeckBlob = await altPitchDeckResponse.blob();
      
      console.log(`Fund thesis size: ${fundThesisBlob.size} bytes`);
      console.log(`Pitch deck size: ${pitchDeckBlob.size} bytes`);
      
      if (fundThesisBlob.size === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Fund thesis document is empty',
            details: 'Please upload a valid fund thesis document in your profile settings'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      if (pitchDeckBlob.size === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Pitch deck document is empty',
            details: 'The company pitch deck appears to be empty or inaccessible'
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      // Convert blobs to base64
      const fundThesisBase64 = await blobToBase64(fundThesisBlob);
      const pitchDeckBase64 = await blobToBase64(pitchDeckBlob);
      
      // Call Gemini and process the results
      return await processDocumentsWithGemini(
        GEMINI_API_KEY,
        fundThesisBase64,
        pitchDeckBase64,
        company_id,
        user_id,
        authHeader,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    }
    
    // If we get here, both document fetches were successful
    const fundThesisBlob = await fundThesisResponse.blob();
    const pitchDeckBlob = await pitchDeckResponse.blob();

    console.log(`Fund thesis size: ${fundThesisBlob.size} bytes`);
    console.log(`Pitch deck size: ${pitchDeckBlob.size} bytes`);

    if (fundThesisBlob.size === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Fund thesis document is empty',
          details: 'Please upload a valid fund thesis document in your profile settings'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    if (pitchDeckBlob.size === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Pitch deck document is empty',
          details: 'The company pitch deck appears to be empty or inaccessible'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Convert blobs to base64
    const fundThesisBase64 = await blobToBase64(fundThesisBlob);
    const pitchDeckBase64 = await blobToBase64(pitchDeckBlob);

    // Call Gemini and process the results
    return await processDocumentsWithGemini(
      GEMINI_API_KEY,
      fundThesisBase64,
      pitchDeckBase64,
      company_id,
      user_id,
      authHeader,
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

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

// Function to process documents with Gemini API
async function processDocumentsWithGemini(
  GEMINI_API_KEY: string,
  fundThesisBase64: string,
  pitchDeckBase64: string,
  company_id: string,
  user_id: string,
  authHeader: string,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
): Promise<Response> {
  // Prepare the prompt for Gemini
  const promptText = `You are an expert venture capital analyst. Analyze how well the pitch deck aligns with the fund thesis. 
              
              First, you need to calculate a Synergy Score using the following framework:
              
              STARTUP EVALUATION FRAMEWORK:
              
              1. Identify key sections from both the pitch deck and fund thesis.
              2. Rate each section on a 1-5 scale.
              3. Calculate the synergy index using the formula:
                 SynergyIndex = Sum(Sik × (Scorei × Scorek / 5))
                 Where Sik is the synergy weight (importance) for each pair of sections.
              4. Common synergy pairs to consider:
                 - Problem-Market fit
                 - Product-Competitive Landscape
                 - Business Model-Financials
                 - Traction-Go-to-Market
              5. Calculate the final Synergy Score on a scale of 1-5.
              
              Provide your analysis in exactly the following format with these three sections ONLY:
              
              1. Overall Summary - Start with "Synergy Score: X.X/5" followed by a concise evaluation of the overall alignment
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
}
