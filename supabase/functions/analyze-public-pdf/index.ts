
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { getReportData } from "./reportService.ts";
import { analyzeWithOpenAI } from "../analyze-pdf/openaiService.ts";
import { saveAnalysisResults } from "../analyze-pdf/databaseService.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

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
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
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

    // Log all headers for debugging (redacted for security)
    console.log("All request headers:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${key.toLowerCase().includes('auth') ? '[REDACTED]' : value}`);
    }
    
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
    
    // Create a service client for direct database updates
    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY
    );
    
    // Update report status to processing
    try {
      const { error: updateError } = await serviceClient
        .from('reports')
        .update({ 
          analysis_status: 'processing',
          analysis_error: null // Clear any previous errors
        })
        .eq('id', reportId);
      
      if (updateError) {
        console.warn("Could not update report status to processing:", updateError);
      } else {
        console.log(`Updated report ${reportId} status to 'processing'`);
      }
    } catch (statusUpdateError) {
      console.warn("Error updating report status to processing:", statusUpdateError);
    }
    
    try {
      // Get report data - note we're using our specialized reportService for public uploads
      console.log("Retrieving report data...");
      const { supabase, report, pdfBase64 } = await getReportData(reportId, req.headers.get('Authorization') || '');
      
      if (!pdfBase64 || pdfBase64.length === 0) {
        throw new Error("Retrieved PDF is empty or could not be converted to base64");
      }
      
      // Quick validation of PDF content - check if it starts with %PDF
      const decodedStart = atob(pdfBase64.substring(0, 8));
      if (!decodedStart.startsWith('%PDF')) {
        console.warn("Warning: The retrieved file may not be a valid PDF. First bytes:", decodedStart);
      }
      
      console.log(`Successfully retrieved report data for ${report.title}, analyzing with Gemini`);
      
      try {
        // Analyze the PDF with Gemini
        const analysis = await analyzeWithOpenAI(pdfBase64, GEMINI_API_KEY);
        
        console.log("Gemini analysis complete, saving results to database");
        
        // Save analysis results to database
        const companyId = await saveAnalysisResults(supabase, analysis, report);

        console.log(`Analysis complete, created company with ID: ${companyId}`);
        
        // Try to trigger the Perplexity research and company details extraction concurrently
        // But don't fail the main job if either fails
        try {
          // Define an array of promises for the background tasks
          const backgroundTasks = [];
          
          // Add Perplexity research task if assessment points are available
          if (analysis.assessmentPoints && analysis.assessmentPoints.length > 0) {
            console.log("Initiating market research with Perplexity API");
            
            // Check if we have the Perplexity API key
            const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
            
            if (PERPLEXITY_API_KEY) {
              // Create the research task
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
              
              // Add to background tasks
              backgroundTasks.push(doResearch());
            } else {
              console.log("Skipping market research - PERPLEXITY_API_KEY not configured");
            }
          } else {
            console.log("Skipping market research - no assessment points available");
          }
          
          // Add company details extraction task
          console.log("Initiating company details extraction with Gemini API");
          const extractDetails = async () => {
            try {
              console.log("Starting company details extraction in background");
              
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
                console.error(`Details extraction failed (${detailsResponse.status}): ${errorText}`);
              } else {
                console.log("Company details extraction completed successfully");
              }
            } catch (detailsError) {
              console.error("Error in company details extraction task:", detailsError);
            }
          };
          
          // Add to background tasks
          backgroundTasks.push(extractDetails());
          
          // Run all background tasks but don't wait for them to complete
          if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            console.log("Using EdgeRuntime.waitUntil for background processing");
            EdgeRuntime.waitUntil(Promise.all(backgroundTasks));
          } else {
            console.log("EdgeRuntime not available, starting tasks without waitUntil");
            // Just start the tasks but don't await them
            Promise.all(backgroundTasks).catch(err => console.error("Background tasks failed:", err));
          }
          
          console.log("Background tasks initiated");
        } catch (backgroundTasksError) {
          console.error("Error setting up background tasks:", backgroundTasksError);
          // Don't fail the main job due to background tasks failure
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
          const { error: updateError } = await serviceClient
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
      
      // Update the report status to failed in the database
      try {
        const { error: updateError } = await serviceClient
          .from('reports')
          .update({ 
            analysis_status: 'failed',
            analysis_error: errorMessage 
          })
          .eq('id', reportId);
          
        if (updateError) {
          console.error("Error updating report failure status:", updateError);
        }
      } catch (updateError) {
        console.error("Failed to update report error status:", updateError);
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
    console.error("Error in analyze-public-pdf function:", error);
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
