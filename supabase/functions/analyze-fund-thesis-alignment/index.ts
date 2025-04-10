
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

    const { company_id, user_id, force_refresh = false } = requestData;

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
    
    // Only return existing analysis if not forcing refresh and it's less than 1 hour old
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    if (!force_refresh && existingAnalysis && existingAnalysis.length > 0) {
      const analysisDate = new Date(existingAnalysis[0].created_at);
      // If analysis exists but is older than 1 hour, we'll generate a new one
      if (analysisDate > oneHourAgo) {
        // Return existing recent analysis
        console.log('Found recent existing analysis, returning it');
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
      console.log('Existing analysis is older than 1 hour or force_refresh requested, generating new one');
    } else {
      console.log('No existing analysis found or force_refresh requested, creating new one');
    }

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

    // Check fund thesis document size
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

    // Fetch the company sections data
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

    // Get company details for more specific context
    const companyDetailsResponse = await fetch(`${SUPABASE_URL}/rest/v1/company_details?company_id=eq.${company_id}&select=*`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });
    
    let companyDetails = {};
    if (companyDetailsResponse.ok) {
      const detailsData = await companyDetailsResponse.json();
      companyDetails = detailsData[0] || {};
    }
    
    // Convert fund thesis blob to base64
    const fundThesisBase64 = await blobToBase64(fundThesisBlob);
    
    // Also get VC profile information
    const vcProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/vc_profiles?id=eq.${user_id}&select=*`, {
      headers: {
        'Authorization': authHeader,
        'apikey': SUPABASE_ANON_KEY as string,
      }
    });
    
    let vcProfile = {};
    if (vcProfileResponse.ok) {
      const profileData = await vcProfileResponse.json();
      if (profileData && profileData.length > 0) {
        vcProfile = profileData[0] || {};
      }
    }
    
    // Call Gemini and process the results
    return await processWithGemini(
      GEMINI_API_KEY,
      fundThesisBase64,
      company,
      companyDetails,
      enrichedSections,
      vcProfile,
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
  companyDetails: any,
  sections: any[],
  vcProfile: any,
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
COMPANY INDUSTRY: ${companyDetails.industry || 'Unspecified'}
COMPANY STAGE: ${companyDetails.stage || 'Early Stage'}
COMPANY INTRODUCTION: ${companyDetails.introduction || ''}
WEBSITE: ${companyDetails.website || ''}
OVERALL SCORE: ${company.overall_score || 'Not rated'}/5
ASSESSMENT POINTS:
${company.assessment_points?.map((point: string) => `- ${point}`).join('\n') || '- None listed.'}
`;

  // Add VC profile info if available
  const vcProfileInfo = vcProfile ? `
VC FUND NAME: ${vcProfile.fund_name || 'Unnamed Fund'}
INVESTMENT STAGES: ${vcProfile.investment_stage?.join(', ') || 'Not specified'}
AREAS OF INTEREST: ${vcProfile.areas_of_interest?.join(', ') || 'Not specified'}
FUND SIZE: ${vcProfile.fund_size || 'Not specified'}
COMPANIES INVESTED: ${vcProfile.companies_invested?.join(', ') || 'Not specified'}
` : '';

  // Prepare the prompt for Gemini - Using more specific and detailed instructions
  const promptText = `You are an expert venture capital analyst specialized in thesis alignment. Your task is to analyze the provided Fund Thesis document (uploaded as PDF) and determine how well the company aligns with this investor's specific investment thesis.

FUND THESIS DOCUMENT: [PDF document uploaded and provided as base64]
${vcProfileInfo}

COMPANY INFORMATION:
${companyInfo}

DETAILED COMPANY ASSESSMENT:
${sectionsInfo}

ANALYSIS TASK:
1. DEEPLY analyze the fund thesis document - READ IT THOROUGHLY
2. Compare specific elements from the fund thesis to the company details
3. Identify CONCRETE and SPECIFIC points of alignment and divergence
4. Focus on actual criteria mentioned in the thesis: industry preferences, stage focus, market size requirements, geographic preferences, founder criteria, business model preferences

YOUR RESPONSE MUST INCLUDE:

1. Overall Summary
- Provide a concise analysis of how well the company fits with THIS SPECIFIC fund's investment thesis
- Directly reference at least 3 specific criteria from the fund thesis document
- Assign a Synergy Score from 0.0 to 5.0 (with one decimal place) that accurately reflects the degree of alignment with THIS SPECIFIC fund thesis

2. Key Similarities
- List SPECIFIC ways this company meets criteria stated in THIS SPECIFIC fund thesis
- Each similarity MUST reference an EXPLICIT requirement or preference from the fund thesis document with page numbers or direct quotes
- DO NOT list generic similarities - only include points that directly match criteria from THIS PARTICULAR fund thesis

3. Key Differences
- List SPECIFIC ways this company DOES NOT meet criteria stated in THIS SPECIFIC fund thesis
- Each difference MUST reference an EXPLICIT requirement or preference from the fund thesis document with page numbers or direct quotes
- DO NOT list generic differences - only include points that directly contradict criteria from THIS PARTICULAR fund thesis

IMPORTANT FORMATTING REQUIREMENTS:
- Format the response with clear section headers: "1. Overall Summary", "2. Key Similarities", "3. Key Differences"
- Include a "Synergy Score: X.X/5" in the Overall Summary section
- Format Key Similarities and Key Differences as bullet points
- Include at least 3-5 specific similarities and 3-5 specific differences that directly quote or reference content from THIS SPECIFIC fund thesis

EXAMPLE OF SPECIFIC SIMILARITY (GOOD):
"The fund thesis explicitly states on page 2 that they 'seek B2B SaaS companies with >$1M ARR,' and CompanyX has achieved $1.5M ARR with their B2B SaaS platform."

EXAMPLE OF GENERIC SIMILARITY (BAD):
"The fund invests in good companies, and this seems like a good company."

EXAMPLE OF SPECIFIC DIFFERENCE (GOOD):
"The fund thesis states on page 4 that 'we only invest in North American companies,' while CompanyX operates primarily in Southeast Asia without North American presence."

EXAMPLE OF GENERIC DIFFERENCE (BAD):
"The fund might be looking for different types of companies."

IMPORTANT: If you can't find specific criteria in the fund thesis, say explicitly "The fund thesis does not specify criteria for X" - do NOT make up criteria that aren't in the document.`;

  try {
    console.log("Calling Gemini API for thesis alignment analysis with detailed instruction");
    
    // Track the start time for calculating processing duration
    const startTime = new Date();
    
    // Save the prompt to the database before making the API call
    const promptSent = promptText;
    
    // Prepare the Gemini API request
    const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";
    const urlWithApiKey = `${geminiEndpoint}?key=${GEMINI_API_KEY}`;
    
    try {
      // Call Gemini API
      const geminiResponse = await fetch(urlWithApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: fundThesisBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more precise responses
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096
          }
        })
      });
      
      // Process the response
      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error("Gemini API error:", errorData);
        throw new Error(errorData.error?.message || "Error calling Gemini API");
      }
      
      const geminiData = await geminiResponse.json();
      console.log("Gemini API response received");
      
      // Extract the analysis text
      let analysisText = "";
      if (geminiData.candidates && geminiData.candidates.length > 0 && 
          geminiData.candidates[0].content && geminiData.candidates[0].content.parts) {
        analysisText = geminiData.candidates[0].content.parts[0].text;
      }
      
      if (!analysisText) {
        throw new Error("Empty response from Gemini API");
      }
      
      console.log("Analysis length:", analysisText.length);
      console.log("Analysis preview:", analysisText.substring(0, 200) + "...");
      
      // Calculate processing time
      const endTime = new Date();
      const processingTimeMs = endTime.getTime() - startTime.getTime();
      console.log(`Analysis completed in ${processingTimeMs}ms`);
      
      // Store the response in the database
      console.log("Storing analysis in database");
      const { error: insertError } = await fetch(`${SUPABASE_URL}/rest/v1/fund_thesis_analysis`, {
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
          prompt_sent: promptSent,
          response_received: JSON.stringify(geminiData)
        })
      }).then(res => res.json());
      
      if (insertError) {
        console.error("Error storing analysis:", insertError);
      } else {
        console.log("Analysis stored successfully");
      }
      
      // Return the analysis to the client
      return new Response(JSON.stringify({ 
        analysis: analysisText,
        prompt_sent: promptSent,
        response_received: JSON.stringify(geminiData),
        processing_time_ms: processingTimeMs
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
      
    } catch (error) {
      console.error("Error during Gemini API call:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in processWithGemini:", error);
    throw error;
  }
}
