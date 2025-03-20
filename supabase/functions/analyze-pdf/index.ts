
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
    // Check environment variables early
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
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
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

    // Log the authorization header (redacted for security)
    const authHeader = req.headers.get('Authorization') || '';
    console.log(`Authorization header present: ${authHeader ? 'Yes' : 'No'}`);
    
    // Also log the API key header (redacted)
    const apiKeyHeader = req.headers.get('apikey') || '';
    console.log(`API key header present: ${apiKeyHeader ? 'Yes' : 'No'}`);

    // Parse request data
    let reqData;
    try {
      reqData = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format. Expected JSON with reportId property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { reportId } = reqData;
    
    // Enhanced reportId validation
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
    
    // Validate that reportId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      console.error(`Invalid reportId format: "${reportId}"`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid report ID format. Expected a UUID, got: ${reportId}`,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing report ${reportId}`);
    
    try {
      // Pass the auth header to getReportData for possible use in debugging
      const { supabase, report, pdfBase64 } = await getReportData(reportId, authHeader);
      
      console.log("Successfully retrieved report data, analyzing with Gemini");
      
      try {
        // Analyze the PDF with Gemini
        const analysis = await analyzeWithOpenAI(pdfBase64, GEMINI_API_KEY);
        
        console.log("Gemini analysis complete, saving results to database");
        
        // Save analysis results to database
        const companyId = await saveAnalysisResults(supabase, analysis, report);

        console.log(`Analysis complete, created company with ID: ${companyId}`);
        
        // Try to trigger the Perplexity research after the main analysis
        // But don't fail the main job if research fails
        try {
          if (analysis.assessmentPoints && analysis.assessmentPoints.length > 0) {
            console.log("Initiating market research with Perplexity API");
            
            // Check if we have the Perplexity API key
            const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
            
            if (!PERPLEXITY_API_KEY) {
              console.log("Skipping market research - PERPLEXITY_API_KEY not configured");
            } else {
              // Run this in background so it doesn't block completion
              const doResearch = async () => {
                try {
                  console.log("Starting Perplexity research in background");
                  
                  // Prepare the data for the research API
                  const assessmentText = analysis.assessmentPoints.join("\n\n");
                  
                  // Call the research function
                  const researchResponse = await fetch(`${SUPABASE_URL}/functions/v1/research-with-perplexity`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      companyId,
                      assessmentText
                    })
                  });
                  
                  if (!researchResponse.ok) {
                    const errorText = await researchResponse.text();
                    console.error(`Research failed (${researchResponse.status}): ${errorText}`);
                  } else {
                    console.log("Research completed successfully");
                  }
                } catch (researchError) {
                  console.error("Error in background research task:", researchError);
                }
              };
              
              // Start the research but don't wait for it to complete
              if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
                console.log("Using EdgeRuntime.waitUntil for background processing");
                EdgeRuntime.waitUntil(doResearch());
              } else {
                console.log("EdgeRuntime not available, starting research without waitUntil");
                // Just start the research but don't await it
                doResearch().catch(err => console.error("Background research failed:", err));
              }
              
              console.log("Research task initiated in background");
            }
          } else {
            console.log("Skipping market research - no assessment points available");
          }
        } catch (researchSetupError) {
          console.error("Error setting up research task:", researchSetupError);
          // Don't fail the main job due to research failure
        }

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
      } catch (analysisError) {
        console.error("Analysis error:", analysisError);
        
        // Update the report with the error
        try {
          const { error: updateError } = await supabase
            .from('reports')
            .update({ 
              analysis_status: 'failed',
              analysis_error: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error'
            })
            .eq('id', reportId);
          
          if (updateError) {
            console.error("Error updating report status:", updateError);
          }
        } catch (statusUpdateError) {
          console.error("Error updating report failure status:", statusUpdateError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: analysisError instanceof Error ? analysisError.message : 'Analysis failed',
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }
    } catch (error) {
      console.error("Operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      // Print detailed stack trace to logs if available
      if (error instanceof Error && error.stack) {
        console.error("Error stack trace:", error.stack);
      }
      
      // Determine appropriate status code
      let status = 500;
      if (errorMessage.includes("not found")) {
        status = 404;
        console.error(`Report not found for id ${reportId}`);
      } else if (errorMessage.includes("Invalid report ID format")) {
        status = 400;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: status 
        }
      );
    }
  } catch (error) {
    console.error("Error in analyze-pdf function:", error);
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
