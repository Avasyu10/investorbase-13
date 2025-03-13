
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
      console.error("OPENAI_API_KEY is not configured");
      throw new Error('OPENAI_API_KEY is not configured');
    }

    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      throw new Error("Invalid request format. Expected JSON with reportId property.");
    }

    const { reportId } = reqData;
    if (!reportId) {
      console.error("Missing reportId in request");
      throw new Error("Report ID is required");
    }

    console.log(`Processing report ${reportId}`);

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      throw new Error('Authorization header is required');
    }

    try {
      // Get report data and verify access
      const { supabase, report, user, pdfBase64 } = await getReportData(reportId, authHeader);
      
      console.log("Successfully retrieved report data, analyzing with OpenAI");
      
      // Analyze the PDF with OpenAI
      const analysis = await analyzeWithOpenAI(pdfBase64, OPENAI_API_KEY);
      
      console.log("OpenAI analysis complete, saving results to database");
      
      // Save analysis results to database
      const companyId = await saveAnalysisResults(supabase, analysis, report);

      console.log(`Analysis complete, created company with ID: ${companyId}`);

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
      console.error("Operation error:", error);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
