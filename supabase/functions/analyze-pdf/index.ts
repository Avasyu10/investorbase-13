
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "./cors.ts";
import { getReportData } from "./reportService.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { saveAnalysisResults } from "./databaseService.ts";

serve(async (req) => {
  console.log(`[analyze-pdf] Request received: ${req.method} ${req.url}`);
  console.log(`[analyze-pdf] Headers: ${JSON.stringify(Object.fromEntries([...req.headers]))}`);
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('[analyze-pdf] Returning CORS preflight response');
    return corsResponse;
  }

  try {
    // Check environment variables early
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log(`[analyze-pdf] Environment variables check: GEMINI_API_KEY exists: ${!!GEMINI_API_KEY}, SUPABASE_URL exists: ${!!SUPABASE_URL}, SUPABASE_ANON_KEY exists: ${!!SUPABASE_ANON_KEY}`);
    
    if (!GEMINI_API_KEY) {
      console.error("[analyze-pdf] GEMINI_API_KEY is not configured");
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
      console.error("[analyze-pdf] Supabase credentials are not configured");
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

    // Parse request data - CRITICAL FIX: Properly handle empty request body
    let reqData;
    try {
      if (req.body === null) {
        console.error("[analyze-pdf] Request body is null");
        return new Response(
          JSON.stringify({ 
            error: "Request body is empty. Expected JSON with reportId property.",
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      const reqText = await req.text();
      console.log(`[analyze-pdf] Raw request body length: ${reqText.length}`);
      console.log(`[analyze-pdf] Raw request body preview: ${reqText.substring(0, 200)}`);
      
      if (!reqText || reqText.trim() === '') {
        console.error("[analyze-pdf] Empty request body");
        return new Response(
          JSON.stringify({ 
            error: "Request body is empty. Expected JSON with reportId property.",
            success: false
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      try {
        reqData = JSON.parse(reqText);
        console.log("[analyze-pdf] Request data parsed:", JSON.stringify(reqData));
      } catch (parseError) {
        console.error("[analyze-pdf] Error parsing request JSON:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Invalid JSON format in request body.",
            success: false,
            rawBody: reqText.substring(0, 100) // Include a preview of the raw body for debugging
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
    } catch (e) {
      console.error("[analyze-pdf] Error reading request body:", e);
      return new Response(
        JSON.stringify({ 
          error: "Error reading request body. Expected JSON with reportId property.",
          success: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { reportId } = reqData || {};
    
    // Enhanced reportId validation
    if (!reportId) {
      console.error("[analyze-pdf] Missing reportId in request");
      return new Response(
        JSON.stringify({ 
          error: "Report ID is required",
          success: false,
          receivedData: reqData
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
      console.error(`[analyze-pdf] Invalid reportId format: "${reportId}"`);
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

    console.log(`[analyze-pdf] Processing report ${reportId}`);
    
    try {
      // Get report data without authentication
      const { supabase, report, pdfBase64 } = await getReportData(reportId);
      
      console.log("[analyze-pdf] Successfully retrieved report data, analyzing with Gemini");
      
      try {
        // Analyze the PDF with Gemini
        const analysis = await analyzeWithOpenAI(pdfBase64, GEMINI_API_KEY);
        
        console.log("[analyze-pdf] Gemini analysis complete, saving results to database");
        
        // Save analysis results to database
        const companyId = await saveAnalysisResults(supabase, analysis, report);

        console.log(`[analyze-pdf] Analysis complete, created company with ID: ${companyId}`);
        
        // Try to trigger the Perplexity research and details extraction concurrently
        // But don't fail the main job if either fails
        try {
          // Define an array of promises for the background tasks
          const backgroundTasks = [];
          
          // Add Perplexity research task if assessment points are available
          if (analysis.assessmentPoints && analysis.assessmentPoints.length > 0) {
            console.log("[analyze-pdf] Initiating market research with Perplexity API");
            
            // Check if we have the Perplexity API key
            const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
            
            if (PERPLEXITY_API_KEY) {
              // Create the research task
              const doResearch = async () => {
                try {
                  console.log("[analyze-pdf] Starting Perplexity research in background");
                  
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
                    console.error(`[analyze-pdf] Research failed (${researchResponse.status}): ${errorText}`);
                  } else {
                    console.log("[analyze-pdf] Research completed successfully");
                  }
                } catch (researchError) {
                  console.error("[analyze-pdf] Error in background research task:", researchError);
                }
              };
              
              // Add to background tasks
              backgroundTasks.push(doResearch());
            } else {
              console.log("[analyze-pdf] Skipping market research - PERPLEXITY_API_KEY not configured");
            }
          } else {
            console.log("[analyze-pdf] Skipping market research - no assessment points available");
          }
          
          // Add company details extraction task
          console.log("[analyze-pdf] Initiating company details extraction with Gemini API");
          const extractDetails = async () => {
            try {
              console.log("[analyze-pdf] Starting company details extraction in background");
              
              // Call the details-in-analyze-pdf function
              const detailsResponse = await fetch(`${SUPABASE_URL}/functions/v1/details-in-analyze-pdf`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  reportId,
                  companyId
                })
              });
              
              if (!detailsResponse.ok) {
                const errorText = await detailsResponse.text();
                console.error(`[analyze-pdf] Details extraction failed (${detailsResponse.status}): ${errorText}`);
              } else {
                console.log("[analyze-pdf] Company details extraction completed successfully");
              }
            } catch (detailsError) {
              console.error("[analyze-pdf] Error in company details extraction task:", detailsError);
            }
          };
          
          // Add to background tasks
          backgroundTasks.push(extractDetails());
          
          // Run all background tasks but don't wait for them to complete
          if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            console.log("[analyze-pdf] Using EdgeRuntime.waitUntil for background processing");
            EdgeRuntime.waitUntil(Promise.all(backgroundTasks));
          } else {
            console.log("[analyze-pdf] EdgeRuntime not available, starting tasks without waitUntil");
            // Just start the tasks but don't await them
            Promise.all(backgroundTasks).catch(err => console.error("[analyze-pdf] Background tasks failed:", err));
          }
          
          console.log("[analyze-pdf] Background tasks initiated");
        } catch (backgroundTasksError) {
          console.error("[analyze-pdf] Error setting up background tasks:", backgroundTasksError);
          // Don't fail the main job due to background tasks failure
        }

        console.log("[analyze-pdf] Sending success response");
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
        console.error("[analyze-pdf] Analysis error:", analysisError);
        
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
            console.error("[analyze-pdf] Error updating report status:", updateError);
          }
        } catch (statusUpdateError) {
          console.error("[analyze-pdf] Error updating report failure status:", statusUpdateError);
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
      console.error("[analyze-pdf] Operation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      // Print detailed stack trace to logs if available
      if (error instanceof Error && error.stack) {
        console.error("[analyze-pdf] Error stack trace:", error.stack);
      }
      
      // Determine appropriate status code
      let status = 500;
      if (errorMessage.includes("not found")) {
        status = 404;
        console.error(`[analyze-pdf] Report not found for id ${reportId}`);
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
    console.error("[analyze-pdf] Error in analyze-pdf function:", error);
    
    // Log error stack trace if available
    if (error instanceof Error && error.stack) {
      console.error("[analyze-pdf] Stack trace:", error.stack);
    }
    
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
