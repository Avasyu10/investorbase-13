import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getReportData } from "../analyze-pdf/reportService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables early
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: 'GEMINI_API_KEY is not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Parse request data
    const reqData = await req.json();
    const { reportId, companyId } = reqData;
    
    if (!reportId) {
      console.error("Missing reportId in request");
      return new Response(
        JSON.stringify({ 
          error: "Report ID is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!companyId) {
      console.error("Missing companyId in request");
      return new Response(
        JSON.stringify({ 
          error: "Company ID is required",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Validate reportId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId) || !uuidRegex.test(companyId)) {
      console.error(`Invalid ID format: reportId="${reportId}", companyId="${companyId}"`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid ID format. Expected UUIDs.`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing company details for report ${reportId}, company ${companyId}`);
    
    // Create a service client for database operations
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );
    
    try {
      // Get report data
      console.log("Retrieving report data...");
      const { pdfBase64 } = await getReportData(reportId, req.headers.get('Authorization') || '');
      
      if (!pdfBase64 || pdfBase64.length === 0) {
        throw new Error("Retrieved PDF is empty or could not be converted to base64");
      }
      
      // Extract company details with Gemini
      console.log("Extracting company details with Gemini API...");
      const companyDetails = await extractCompanyDetails(pdfBase64, GEMINI_API_KEY);
      
      console.log("Company details extracted:", companyDetails);
      
      // Save company details to database
      console.log("Saving company details to database...");
      const { data: savedDetails, error: saveError } = await serviceClient
        .from('company_details')
        .upsert({
          company_id: companyId,
          website: companyDetails.website,
          industry: companyDetails.industry,
          stage: companyDetails.stage,
          introduction: companyDetails.introduction
        })
        .select()
        .single();
      
      if (saveError) {
        console.error("Error saving company details:", saveError);
        throw new Error(`Failed to save company details: ${saveError.message}`);
      }
      
      console.log("Company details saved successfully:", savedDetails);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          details: savedDetails,
          message: "Company details extracted and saved successfully" 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (error) {
      console.error("Operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
  } catch (error) {
    console.error("Error in details-in-analyze-pdf function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function extractCompanyDetails(pdfBase64: string, apiKey: string) {
  const acceptableStages = [
    "Pre-seed", "Seed", "Series A", "Series B", "Series C+", 
    "Growth", "Pre-IPO", "Public", "Other"
  ];
  
  const acceptableIndustries = [
    "SaaS", "FinTech", "HealthTech", "EdTech", "E-commerce", 
    "AI/ML", "Blockchain", "CleanTech", "Consumer", "Enterprise", 
    "Gaming", "Hardware", "Marketplace", "Media", "Mobile", 
    "Real Estate", "Transportation", "Other"
  ];

  const prompt = `
You are a specialized AI designed to extract key company information from pitch decks.
Review the provided pitch deck PDF and extract ONLY the following details:

1. Website URL: Extract the company's website URL, if mentioned in the pitch deck.
2. Industry/Sector: Identify which industry or sector the company operates in. 
   Choose exactly ONE from this list: ${acceptableIndustries.join(", ")}
3. Company Stage: Determine the company's funding/growth stage.
   Choose exactly ONE from this list: ${acceptableStages.join(", ")}
4. Introduction: Write a concise introduction (max 500 characters) that summarizes what the company does.

Format your response as a clean JSON object with these exact keys:
{
  "website": "The company website URL or empty string if not found",
  "industry": "ONE industry from the provided list only",
  "stage": "ONE stage from the provided list only",
  "introduction": "One paragraph introduction (max 500 characters)"
}
`;

  try {
    // Update the API endpoint to use gemini-2.0-flash instead of gemini-pro
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
          temperature: 0.2,
          maxOutputTokens: 1024,
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

    const content = data.candidates[0].content;
    
    // Extract the JSON response from the text
    let jsonMatch = null;
    for (const part of content.parts) {
      if (part.text) {
        // Look for JSON object in the text
        const match = part.text.match(/\{[\s\S]*\}/);
        if (match) {
          jsonMatch = match[0];
          break;
        }
      }
    }

    if (!jsonMatch) {
      throw new Error("Could not find JSON data in Gemini response");
    }

    // Parse the JSON string
    const detailsObject = JSON.parse(jsonMatch);
    
    // Validate and sanitize fields
    const sanitizedDetails = {
      website: detailsObject.website?.trim() || "",
      industry: acceptableIndustries.includes(detailsObject.industry) 
        ? detailsObject.industry 
        : "Other",
      stage: acceptableStages.includes(detailsObject.stage)
        ? detailsObject.stage
        : "Other",
      introduction: (detailsObject.introduction?.trim() || "").substring(0, 500)
    };

    return sanitizedDetails;
  } catch (error) {
    console.error("Error extracting company details with Gemini:", error);
    
    // Return default values if extraction fails
    return {
      website: "",
      industry: "Other",
      stage: "Other",
      introduction: "No information available."
    };
  }
}
