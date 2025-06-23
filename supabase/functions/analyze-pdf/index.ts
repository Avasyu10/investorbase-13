
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { getReportData } from "./reportService.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { 
  storeAnalysisResult, 
  updateCompanyFromAnalysis, 
  createSectionsFromAnalysis,
  getExistingAnalysis 
} from "./databaseService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, analysisType, companyName } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    console.log(`Processing request for report ${reportId}`, { analysisType, companyName });

    // Extract API key from environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Determine analysis type and user type
    const usePublicAnalysisPrompt = !!Deno.env.get('USE_PUBLIC_ANALYSIS_PROMPT');
    const scoringScale = parseInt(Deno.env.get('SCORING_SCALE') || '100', 10);
    const isIITBombayUser = !!Deno.env.get('IS_IIT_BOMBAY_USER');

    // Get the report data and PDF
    const { supabase, report, pdfBase64 } = await getReportData(reportId);
    
    // Check if analysis already exists
    const existingAnalysis = await getExistingAnalysis(reportId);
    if (existingAnalysis) {
      console.log(`Analysis found in DB, returning existing analysis`);
      return new Response(JSON.stringify(existingAnalysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze the PDF using OpenAI
    const analysisResult = await analyzeWithOpenAI(
      pdfBase64, 
      geminiApiKey, 
      usePublicAnalysisPrompt,
      scoringScale,
      isIITBombayUser
    );
    
    // Store the analysis result in the database
    await storeAnalysisResult(reportId, analysisResult);
    
    // Update the company with the overall score and assessment points
    if (report.company_id) {
      await updateCompanyFromAnalysis(report.company_id, analysisResult);
    } else {
      console.log('No company ID associated with this report.');
    }
    
    // Create sections from the analysis result
    await createSectionsFromAnalysis(reportId, analysisResult);

    // Return the analysis result
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
