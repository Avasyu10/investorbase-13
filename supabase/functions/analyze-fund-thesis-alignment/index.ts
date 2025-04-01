
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request with CORS headers');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Parse request data
    const requestData = await req.json();
    console.log('Received request data:', JSON.stringify(requestData));
    
    const { company_id, user_id } = requestData;
    
    if (!company_id || !user_id) {
      throw new Error('Company ID and User ID are required');
    }
    
    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);
    
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check if we already have an analysis for this company and user
    console.log('Checking for existing analysis in database');
    const { data: existingAnalysis, error: existingError } = await supabase
      .from('fund_thesis_analysis')
      .select('*')
      .eq('company_id', company_id)
      .eq('user_id', user_id)
      .maybeSingle();
      
    if (existingError) {
      console.error('Error checking for existing analysis:', existingError);
      throw existingError;
    }
    
    // If we have an existing analysis, return it
    if (existingAnalysis) {
      console.log('Found existing analysis, returning it');
      return new Response(
        JSON.stringify({ 
          analysis: existingAnalysis.analysis_text,
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a new analysis
    console.log('No existing analysis found, creating new one');
    
    // First, fetch the fund thesis document for the user
    console.log('Fetching fund thesis document');
    const { data: vcProfile, error: vcProfileError } = await supabase
      .from('vc_profiles')
      .select('fund_thesis_url')
      .eq('id', user_id)
      .maybeSingle();
      
    if (vcProfileError) {
      console.error('Error fetching VC profile:', vcProfileError);
      throw vcProfileError;
    }
    
    if (!vcProfile || !vcProfile.fund_thesis_url) {
      throw new Error('No fund thesis document found for this user');
    }
    
    // Fetch the fund thesis document from storage
    console.log(`Downloading fund thesis document: ${vcProfile.fund_thesis_url}`);
    const fundThesisBytes = await downloadDocument(supabase, vcProfile.fund_thesis_url, user_id);
    console.log(`Fund thesis size: ${fundThesisBytes.byteLength} bytes`);
    
    // Fetch company sections data instead of the full PDF
    console.log('Fetching company sections data');
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('title, type, description, score')
      .eq('company_id', company_id);
      
    if (sectionsError) {
      console.error('Error fetching company sections:', sectionsError);
      throw sectionsError;
    }
    
    if (!sections || sections.length === 0) {
      throw new Error('No sections found for this company');
    }
    
    // Get company name for better context
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, assessment_points')
      .eq('id', company_id)
      .single();
      
    if (companyError) {
      console.error('Error fetching company data:', companyError);
      throw companyError;
    }
    
    // Format sections data for analysis
    const companySectionsText = formatSectionsForAnalysis(sections, company);
    console.log('Formatted company sections text:', companySectionsText.substring(0, 500) + '...');
    
    // Base64 encode the fund thesis PDF
    const fundThesisBase64 = bytesToBase64(fundThesisBytes);
    
    // Process documents with Gemini
    console.log('Calling Gemini API to analyze alignment');
    const analysisResult = await processDocumentsWithGemini(
      fundThesisBase64, 
      companySectionsText, 
      GEMINI_API_KEY
    );
    
    // Store the analysis in the database
    const { data: analysis, error: insertError } = await supabase
      .from('fund_thesis_analysis')
      .insert({
        company_id,
        user_id,
        analysis_text: analysisResult,
        prompt_sent: companySectionsText.substring(0, 1000) + '... [truncated]',
        response_received: analysisResult.substring(0, 1000) + '... [truncated]'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error storing analysis:', insertError);
      throw insertError;
    }
    
    return new Response(
      JSON.stringify({ 
        analysis: analysisResult,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fund thesis alignment analysis:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// Format sections data for analysis
function formatSectionsForAnalysis(sections, company) {
  let formattedText = `# ${company.name} Analysis\n\n`;
  
  // Add assessment points if available
  if (company.assessment_points && company.assessment_points.length > 0) {
    formattedText += "## Assessment Points\n";
    company.assessment_points.forEach((point, index) => {
      formattedText += `${index + 1}. ${point}\n`;
    });
    formattedText += "\n";
  }
  
  formattedText += "## Detailed Section Analysis\n\n";
  
  // Group sections by type for better organization
  const sectionsByType = {};
  sections.forEach(section => {
    if (!sectionsByType[section.type]) {
      sectionsByType[section.type] = [];
    }
    sectionsByType[section.type].push(section);
  });
  
  // Format each section type
  Object.keys(sectionsByType).forEach(type => {
    formattedText += `### ${formatSectionType(type)}\n`;
    
    sectionsByType[type].forEach(section => {
      formattedText += `#### ${section.title}\n`;
      formattedText += `Score: ${section.score}/5\n`;
      if (section.description) {
        formattedText += `${section.description}\n`;
      }
      formattedText += "\n";
    });
  });
  
  return formattedText;
}

// Helper function to format section type
function formatSectionType(type) {
  // Convert types like PROBLEM to "Problem Statement"
  const typeMap = {
    "PROBLEM": "Problem Statement",
    "MARKET": "Market Opportunity",
    "SOLUTION": "Solution",
    "COMPETITIVE_LANDSCAPE": "Competitive Landscape",
    "TRACTION": "Traction",
    "BUSINESS_MODEL": "Business Model",
    "GTM_STRATEGY": "Go-to-Market Strategy",
    "TEAM": "Team",
    "FINANCIALS": "Financials",
    "ASK": "The Ask"
  };
  
  return typeMap[type] || type;
}

// Function to download a document from storage
async function downloadDocument(supabase, filePath, userId) {
  try {
    console.log(`Downloading file from path: ${filePath}`);
    
    // Try to download from VC documents storage
    const { data, error } = await supabase.storage
      .from('vc-documents')
      .download(filePath);
      
    if (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
    
    const bytes = await data.arrayBuffer();
    console.log(`Download successful, file size: ${bytes.byteLength} bytes`);
    return bytes;
  } catch (error) {
    console.error('Error in downloadDocument:', error);
    throw error;
  }
}

// Convert ArrayBuffer to Base64
function bytesToBase64(bytes) {
  const uint8Array = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Process documents with Gemini API
async function processDocumentsWithGemini(fundThesisBase64, companySectionsText, apiKey) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = `You are a professional investment analyst specializing in venture capital. You need to analyze the alignment between a fund thesis document and a startup's pitch deck sections.

FUND THESIS (PDF document attached): This is the investment strategy document from a venture capital fund detailing what types of companies they prefer to invest in, their investment criteria, focus areas, and expectations.

STARTUP INFORMATION:
${companySectionsText}

Your task is to provide a detailed analysis of how well this startup aligns with the fund thesis. Please structure your analysis as follows:

## 1. Overall Summary
Provide a concise summary (3-4 paragraphs) of how well the startup aligns with the fund's investment criteria and strategy.

## 2. Key Similarities
Identify and list at least 5-7 specific areas where the startup strongly aligns with the fund thesis. Be specific about why these aspects make it a good fit.

## 3. Key Differences
Identify and list at least 5-7 specific areas where the startup may not align with the fund thesis, or where there might be concerns. Be honest and objective in your assessment.

Finally, rate the overall alignment on a scale of 1-5, where 1 is "Poor Match" and 5 is "Excellent Match". Format this as "**Synergy Score:** X.X/5" to ensure it's easy to parse.

Your analysis should be thorough, objective, and focused on helping the investor make an informed decision.`;

  try {
    // Construct the Gemini API request
    const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    const urlWithApiKey = `${geminiEndpoint}?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: "application/pdf",
                data: fundThesisBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.0,
        topP: 1.0,
        topK: 40,
        maxOutputTokens: 8192
      }
    };

    const geminiResponse = await fetch(urlWithApiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    // Check for HTTP errors in the Gemini response
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();

    // Extract text from Gemini response
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      throw new Error("Empty response from Gemini");
    }
    
    const responseText = geminiData.candidates[0].content.parts[0].text;
    return responseText;
  } catch (error) {
    console.error('Error in processDocumentsWithGemini:', error);
    throw error;
  }
}
