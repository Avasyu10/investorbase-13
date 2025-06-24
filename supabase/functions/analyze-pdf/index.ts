
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { 
  getReportData, 
  updateReportWithAnalysis,
  saveAnalysisToDatabase,
  createCompanyFromAnalysis 
} from "./reportService.ts";
import { checkAnalysisLimits } from "./databaseService.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Starting PDF Analysis ===");
    
    // Validate environment variables
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Get authorization header and parse request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const { reportId, usePublicAnalysisPrompt = false, scoringScale = 100, stage, industry } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    console.log(`Analysis request: reportId=${reportId}, usePublicAnalysisPrompt=${usePublicAnalysisPrompt}, scoringScale=${scoringScale}`);

    // Extract user info for limit checking
    const token = authHeader.replace('Bearer ', '');
    
    // Check analysis limits before proceeding
    const limitResult = await checkAnalysisLimits(token);
    
    if (!limitResult.canAnalyze) {
      console.log(`Analysis limit reached for user. Current: ${limitResult.currentCount}, Max: ${limitResult.maxAllowed}`);
      return new Response(
        JSON.stringify({ 
          error: `Analysis limit reached. You have used ${limitResult.currentCount} out of ${limitResult.maxAllowed} allowed analyses.`,
          success: false,
          limitReached: true,
          currentCount: limitResult.currentCount,
          maxAllowed: limitResult.maxAllowed
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    // Get report data and PDF
    console.log("Fetching report data...");
    const { report, pdfBase64, isIITBombayUser } = await getReportData(reportId, authHeader);
    
    console.log(`Report found: ${report.title}, IIT Bombay user: ${isIITBombayUser}`);

    // Analyze PDF with OpenAI/Gemini
    console.log("Starting AI analysis...");
    const analysis = await analyzeWithOpenAI(
      pdfBase64, 
      GEMINI_API_KEY, 
      usePublicAnalysisPrompt, 
      scoringScale,
      isIITBombayUser
    );
    
    console.log("AI analysis completed successfully");

    // Update report with analysis results
    console.log("Updating report with analysis...");
    await updateReportWithAnalysis(reportId, analysis, authHeader);

    // Save analysis data to database (sections, details, etc.)
    console.log("Saving analysis to database...");
    const { companyId } = await saveAnalysisToDatabase(reportId, analysis, authHeader);
    
    console.log(`Analysis saved. Company ID: ${companyId}`);

    // Create company record from analysis if needed
    if (companyId && !report.company_id) {
      console.log("Creating company record...");
      await createCompanyFromAnalysis(reportId, analysis, report.title, authHeader);
    }

    // Trigger company details extraction in the background (including stage and industry from form)
    console.log("Triggering company details extraction...");
    EdgeRuntime.waitUntil(
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/details-in-analyze-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ 
          reportId, 
          companyId,
          stage: stage || null,  // Pass stage from upload form
          industry: industry || null  // Pass industry from upload form
        }),
      })
        .then(response => response.json())
        .then(result => {
          console.log('Company details extraction result:', result);
        })
        .catch(error => {
          console.error('Company details extraction failed:', error);
        })
    );

    console.log("=== PDF Analysis Completed Successfully ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        companyId,
        message: "PDF analyzed successfully" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = errorMessage.includes('limit') ? 429 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode 
      }
    );
  }
});
