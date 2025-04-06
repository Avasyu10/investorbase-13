
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

    // Instead of fetching the pitch deck PDF, fetch the company sections data
    console.log('Fetching company sections data');
    const sectionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/sections?company_id=eq.${company_id}&select=*`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });

    if (!sectionsResponse.ok) {
      const errorText = await sectionsResponse.text();
      console.error('Failed to fetch company sections:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Could not fetch company sections data',
          details: errorText
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    const sections = await sectionsResponse.json();
    
    if (!sections || sections.length === 0) {
      console.error('No sections found for company:', company_id);
      return new Response(
        JSON.stringify({ 
          error: 'No sections found for this company',
          details: 'Company does not have any associated sections'
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    console.log('Found sections for company:', sections.length);
    
    // For each section, get its details (strengths and weaknesses)
    console.log('Fetching section details');
    const sectionIds = sections.map(section => section.id);
    
    const sectionDetailsResponse = await fetch(`${SUPABASE_URL}/rest/v1/section_details?section_id=in.(${sectionIds.join(',')})`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });
    
    if (!sectionDetailsResponse.ok) {
      const errorText = await sectionDetailsResponse.text();
      console.error('Failed to fetch section details:', errorText);
    }
    
    const sectionDetails = await sectionDetailsResponse.json();
    
    // Organize section details by section id
    const sectionDetailsMap = {};
    sectionDetails.forEach(detail => {
      if (!sectionDetailsMap[detail.section_id]) {
        sectionDetailsMap[detail.section_id] = {
          strengths: [],
          weaknesses: []
        };
      }
      
      if (detail.detail_type === 'strength') {
        sectionDetailsMap[detail.section_id].strengths.push(detail.content);
      } else if (detail.detail_type === 'weakness') {
        sectionDetailsMap[detail.section_id].weaknesses.push(detail.content);
      }
    });
    
    // Enrich sections with their details
    const enrichedSections = sections.map(section => ({
      ...section,
      strengths: sectionDetailsMap[section.id]?.strengths || [],
      weaknesses: sectionDetailsMap[section.id]?.weaknesses || []
    }));

    // Also fetch the company data for more context
    console.log('Fetching company data');
    const companyResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${company_id}&select=*`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });

    if (!companyResponse.ok) {
      const errorText = await companyResponse.text();
      console.error('Failed to fetch company data:', errorText);
    }
    
    const companyData = await companyResponse.json();
    const company = companyData[0] || {};
    
    // Get the fund thesis as blob and convert to base64
    const fundThesisBlob = await fundThesisResponse.blob();
    
    console.log(`Fund thesis size: ${fundThesisBlob.size} bytes`);
    
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
    
    // Convert fund thesis blob to base64
    const fundThesisBase64 = await blobToBase64(fundThesisBlob);
    
    // Call Gemini and process the results
    return await processWithGemini(
      GEMINI_API_KEY,
      fundThesisBase64,
      company,
      enrichedSections,
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

// Function to process with Gemini API using sections data instead of pitch deck PDF
async function processWithGemini(
  GEMINI_API_KEY: string,
  fundThesisBase64: string,
  company: any,
  sections: any[],
  company_id: string,
  user_id: string,
  authHeader: string,
  SUPABASE_URL: string,
  SUPABASE_ANON_KEY: string
): Promise<Response> {
  // Format the sections data into a structured string for the prompt
  const sectionsInfo = sections.map(section => {
    return `
SECTION: ${section.title} (${section.type})
SCORE: ${section.score}/5
DESCRIPTION: ${section.description || 'No description provided.'}
STRENGTHS:
${section.strengths.map(s => `- ${s}`).join('\n') || '- None listed.'}
WEAKNESSES:
${section.weaknesses.map(w => `- ${w}`).join('\n') || '- None listed.'}
`;
  }).join('\n\n');

  // Add company overall info
  const companyInfo = `
COMPANY NAME: ${company.name || 'Unnamed'}
OVERALL SCORE: ${company.overall_score || 'Not rated'}/5
ASSESSMENT POINTS:
${company.assessment_points?.map((point: string) => `- ${point}`).join('\n') || '- None listed.'}
`;

  // Prepare the prompt for Gemini - Using the same framework but with sections data
  const promptText = `You are an expert venture capital analyst. Analyze how well the company aligns with the fund thesis. 
Use the following framework to calculate a Synergy Score:

STARTUP EVALUATION FRAMEWORK:
1. Score a startup's fundamentals (Problem, Market, Product, etc.)
2. Incorporate cross-sectional synergy (how various sections reinforce or undermine each other)
3. Adjust for risk factors relevant to the startup's stage and the investor's thesis
The end result is a Composite Score that helps analysts quickly compare different deals.

CALCULATE THE FINAL SYNERGY SCORE ON A SCALE OF 1-5.

NOW, create a detailed analysis with the following structure:

**1. Overall Summary**

Start with "**Synergy Score:** X.X/5" on its own line, where X.X is a score from 1.0 to 5.0 that represents how well the company aligns with the fund thesis.

Then provide 2-3 paragraphs summarizing the overall alignment between the company and the fund thesis. Be specific about strengths and weaknesses in the alignment.

**2. Key Similarities**

List 3-5 bullet points describing specific areas where the company aligns well with the fund thesis priorities. Each bullet point should be detailed and specific, not generic.

**3. Key Differences**

List 3-6 bullet points highlighting specific areas where the company diverges from or fails to address key elements of the fund thesis. Be detailed and suggest what could be improved to better align with the investor's priorities.

Make your analysis substantive, data-driven, and specific to both documents. Avoid generic statements that could apply to any company or fund thesis.

Fund Thesis PDF Content:
${fundThesisBase64}

Company Information:
${companyInfo}

Company Sections Analysis:
${sectionsInfo}`;

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
        temperature: 0.3,
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
