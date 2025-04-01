
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Request method:", req.method);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  try {
    // Parse request data
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData));

    const { company_id, user_id } = requestData;

    if (!company_id || !user_id) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({ error: "Missing company_id or user_id parameters", success: false }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log(`Processing fund thesis alignment for company ${company_id} and user ${user_id}`);

    // Create Supabase client with admin permissions to access storage and database
    const adminSupabase = createClient(
      SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Check if analysis already exists
    const { data: existingAnalysis, error: lookupError } = await adminSupabase
      .from('fund_thesis_analysis')
      .select('*')
      .eq('company_id', company_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up existing analysis:", lookupError);
    } else if (existingAnalysis) {
      console.log("Found existing analysis:", existingAnalysis);
      return new Response(
        JSON.stringify({ 
          analysis: existingAnalysis.analysis_text,
          success: true
        }),
        { headers: corsHeaders }
      );
    }

    console.log("No existing analysis found, creating new one");

    // Fetch fund thesis document
    console.log("Fetching fund thesis document");
    
    // List all user directories in vc-documents storage bucket to find the user's folder
    const { data: userDirs, error: listError } = await adminSupabase
      .storage
      .from('vc-documents')
      .list();
      
    if (listError) {
      console.error("Error listing directories in vc-documents bucket:", listError);
      return new Response(
        JSON.stringify({ 
          error: "Error accessing fund thesis storage", 
          details: listError.message,
          success: false 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    console.log("Files in vc-documents bucket:", JSON.stringify(userDirs));
    
    // Check if user directory exists
    let fundThesisURL = '';
    
    // Find the user's most recent fund thesis
    const { data: userFiles, error: userFilesError } = await adminSupabase
      .storage
      .from('vc-documents')
      .list(user_id);
    
    if (userFilesError) {
      console.error("Error listing files in user directory:", userFilesError);
      return new Response(
        JSON.stringify({ 
          error: "Error accessing user's fund thesis documents", 
          details: userFilesError.message,
          success: false 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    // Sort files by name in descending order to get the most recent one
    // Assuming filenames are timestamps
    const pdfFiles = userFiles
      .filter(file => file.name.endsWith('.pdf'))
      .sort((a, b) => b.name.localeCompare(a.name));
    
    if (pdfFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No fund thesis document found. Please upload a fund thesis document in your profile.", 
          success: false 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }
    
    fundThesisURL = `${user_id}/${pdfFiles[0].name}`;
    console.log("Fund thesis URL found:", fundThesisURL);
    
    // Fetch company data
    console.log("Fetching company data");
    const { data: companyData, error: companyError } = await adminSupabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();
    
    if (companyError) {
      console.error("Error fetching company data:", companyError);
      return new Response(
        JSON.stringify({ 
          error: "Company not found", 
          details: companyError.message,
          success: false 
        }),
        { headers: corsHeaders, status: 404 }
      );
    }
    
    // Try to fetch the fund thesis document
    console.log("Trying to fetch fund thesis document from:", fundThesisURL);
    
    const { data: pdfData, error: pdfError } = await adminSupabase
      .storage
      .from('vc-documents')
      .download(fundThesisURL);
    
    if (pdfError) {
      console.error("Error downloading fund thesis:", pdfError);
      return new Response(
        JSON.stringify({ 
          error: "Error downloading fund thesis document", 
          details: pdfError.message,
          success: false 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    // Convert PDF to text
    const arrayBuffer = await pdfData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64PDF = bytesToBase64(uint8Array);
    console.log("Successfully fetched fund thesis content, length:", base64PDF.length);
    
    // Create analysis based on company data and fund thesis
    console.log("Creating analysis based on available data");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: "GEMINI_API_KEY is not configured", 
          success: false 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    // Create the analysis with Gemini API
    const analysis = await createAnalysisWithGemini(companyData, base64PDF, GEMINI_API_KEY);
    
    // Store the analysis in the database
    const { data: savedAnalysis, error: saveError } = await adminSupabase
      .from('fund_thesis_analysis')
      .insert({
        user_id: user_id,
        company_id: company_id,
        analysis_text: analysis,
        prompt_sent: JSON.stringify(companyData),
        response_received: analysis
      })
      .select()
      .single();
    
    if (saveError) {
      console.error("Error saving analysis:", saveError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to save analysis", 
          details: saveError.message,
          success: false,
          analysis: analysis  // Return the analysis even if saving failed
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    console.log("Analysis created and stored successfully");
    
    return new Response(
      JSON.stringify({ 
        analysis: analysis, 
        success: true 
      }),
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error("Error in analyze-fund-thesis-alignment:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred", 
        success: false 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

// Helper function to convert bytes to base64
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

// Helper function to create analysis with Gemini API
async function createAnalysisWithGemini(companyData: any, pdfBase64: string, apiKey: string): Promise<string> {
  try {
    const prompt = `
You are an expert venture capital analyst. I'm going to give you a company to analyze and then my fund's investment thesis document.

Your task is to analyze how well this company aligns with our fund's thesis.

Here is the company information:
${JSON.stringify(companyData, null, 2)}

Analyze this company against my fund's thesis document (attached as PDF) and provide:

1. Overall Summary - A brief assessment of how well this company aligns with our investment thesis. Give a numerical synergy score out of 5 where 5 is perfect alignment.

2. Key Similarities - Bullet points of the most important ways this company matches our thesis (target market, technology, business model, etc.)

3. Key Differences - Bullet points of the most important ways this company differs from our thesis criteria

Format your response in markdown with clear section headers.
`;

    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Invalid response from Gemini API");
    }

    let analysisText = '';
    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        analysisText += part.text;
      }
    }

    if (!analysisText) {
      throw new Error("No text content in Gemini API response");
    }

    return analysisText;
  } catch (error) {
    console.error("Error in createAnalysisWithGemini:", error);
    throw new Error(`Failed to create analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
