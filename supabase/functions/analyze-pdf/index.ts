
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { getReportData } from "./reportService.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { saveAnalysisResults } from "./databaseService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { reportId } = await req.json();
    if (!reportId) {
      throw new Error("Report ID is required");
    }

    console.log(`Processing report ${reportId}`);

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Get report data and verify access
    const { supabase, report, user, pdfBase64 } = await getReportData(reportId, authHeader);
    
    // Analyze the PDF with OpenAI
    const analysis = await analyzeWithOpenAI(pdfBase64, OPENAI_API_KEY);
    
    // Save analysis results to database
    const companyId = await saveAnalysisResults(supabase, analysis, report);

    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId,
        message: "Report analyzed successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
