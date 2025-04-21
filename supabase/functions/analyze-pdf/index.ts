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
      // Get report data without authentication
      const { supabase, report, pdfBase64 } = await getReportData(reportId);
      
      console.log("Successfully retrieved report data, analyzing with Gemini");
      
      try {
        // Analyze the PDF with Gemini
        const analysis = await analyzeWithOpenAI(pdfBase64, Deno.env.get('GEMINI_API_KEY')!);
        
        console.log("Gemini analysis complete, now cross-checking with Perplexity");
        
        // Cross-check with Perplexity API
        const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY') || "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";
        
        if (PERPLEXITY_API_KEY) {
          try {
            console.log("Starting Perplexity cross-check");
            
            // Create a shortened version of the analysis for Perplexity
            // Include only critical components to reduce token size
            const createCompactAnalysis = (fullAnalysis: any) => {
              // Extract just the necessary data for validation
              const compactAnalysis = {
                overallScore: fullAnalysis.overallScore,
                overallSummary: fullAnalysis.overallSummary?.substring(0, 500) || "",
                sections: fullAnalysis.sections?.map((section: any) => ({
                  type: section.type,
                  title: section.title,
                  score: section.score,
                  // Truncate long text fields
                  description: section.description?.substring(0, 200) || ""
                })) || [],
                assessmentPoints: fullAnalysis.assessmentPoints?.slice(0, 3) || []
              };
              
              return compactAnalysis;
            };
            
            const compactAnalysis = createCompactAnalysis(analysis);
            
            // Create a prompt for Perplexity to cross-check the analysis
            const crossCheckPrompt = `
Cross-check and validate this startup analysis. Focus on the scores and assessment accuracy.
Provide any corrections to scores or insights without changing the original JSON format structure.

Here is the analysis to cross-check (compact version for token limits):
${JSON.stringify(compactAnalysis)}

Please return the updated analysis in the exact same JSON format with your corrections to scores and insights.
If scores are off, please correct them using this scoring guideline:
- Individual section scores should be between 1.0-5.0
- Overall score should be the normalized average of section scores (section_avg * 1.25, max 5.0)
            `;
            
            console.log("Perplexity cross-check prompt length:", crossCheckPrompt.length);
            console.log("Perplexity cross-check prompt preview:", crossCheckPrompt.substring(0, 200) + "...");
            
            const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "sonar",
                messages: [
                  {
                    role: "user",
                    content: crossCheckPrompt
                  }
                ],
                temperature: 0.1
              })
            });
            
            // Store detailed request info for debugging
            console.log("Perplexity request details:", {
              endpoint: "https://api.perplexity.ai/chat/completions",
              model: "sonar",
              promptLength: crossCheckPrompt.length,
              temperatureSetting: 0.1
            });
            
            if (!perplexityResponse.ok) {
              const errorText = await perplexityResponse.text();
              console.error("Perplexity cross-check failed:", errorText);
              
              // Save the error information to the analysis for debugging
              analysis.perplexityError = errorText;
              analysis.perplexityCrossCheckPromptLength = crossCheckPrompt.length;
              
              console.log("Proceeding with original analysis without cross-check");
            } else {
              const perplexityData = await perplexityResponse.json();
              console.log("Perplexity cross-check completed successfully");
              
              // Store detailed logs for debugging
              analysis.perplexityCrossCheckPrompt = crossCheckPrompt;
              analysis.perplexityCrossCheckPromptLength = crossCheckPrompt.length;
              analysis.perplexityCrossCheckResponse = JSON.stringify(perplexityData).substring(0, 1000) + "..."; // Save truncated response
              
              console.log("Perplexity response preview:", JSON.stringify(perplexityData).substring(0, 200) + "...");
              
              // Try to parse the Perplexity response and update the analysis if possible
              try {
                if (perplexityData.choices && 
                    perplexityData.choices[0] && 
                    perplexityData.choices[0].message &&
                    perplexityData.choices[0].message.content) {
                  
                  const content = perplexityData.choices[0].message.content;
                  console.log("Raw Perplexity content:", content.substring(0, 200) + "...");
                  
                  // Extract JSON if it's wrapped in markdown code blocks
                  let jsonContent = content;
                  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                  
                  if (jsonMatch && jsonMatch[1]) {
                    jsonContent = jsonMatch[1];
                  }
                  
                  // Try to find JSON object start if there's text before it
                  const jsonStart = jsonContent.indexOf('{');
                  if (jsonStart > 0) {
                    jsonContent = jsonContent.substring(jsonStart);
                  }
                  
                  // Enhanced JSON parsing with error handling and sanitization
                  try {
                    // Log full content for debugging
                    console.log("Attempting to parse JSON content length:", jsonContent.length);
                    
                    // Try to clean potentially malformed JSON
                    let cleanedJson = jsonContent;
                    
                    // Find the last closing brace (in case there's text after the JSON)
                    const lastBrace = cleanedJson.lastIndexOf('}');
                    if (lastBrace > 0 && lastBrace < cleanedJson.length - 1) {
                      cleanedJson = cleanedJson.substring(0, lastBrace + 1);
                      console.log("Truncated JSON to last closing brace at position:", lastBrace);
                    }
                    
                    // Fix any trailing commas before closing brackets
                    cleanedJson = cleanedJson.replace(/,(\s*[\}\]])/g, "$1");
                    
                    // Remove any non-printable or control characters
                    cleanedJson = cleanedJson.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
                    
                    console.log("Cleaned JSON (first 100 chars):", cleanedJson.substring(0, 100));
                    console.log("Cleaned JSON (last 100 chars):", cleanedJson.substring(cleanedJson.length - 100));
                    
                    // Attempt to parse the sanitized JSON
                    const crossCheckedAnalysis = JSON.parse(cleanedJson);
                    console.log("Successfully parsed Perplexity cross-check response");
                    
                    // Update the analysis with the cross-checked data
                    // Keep original data structure but update content
                    if (crossCheckedAnalysis.sections && Array.isArray(crossCheckedAnalysis.sections)) {
                      analysis.sections = crossCheckedAnalysis.sections;
                    }
                    
                    if (crossCheckedAnalysis.overallScore) {
                      analysis.overallScore = crossCheckedAnalysis.overallScore;
                    }
                    
                    if (crossCheckedAnalysis.assessmentPoints && Array.isArray(crossCheckedAnalysis.assessmentPoints)) {
                      analysis.assessmentPoints = crossCheckedAnalysis.assessmentPoints;
                    }
                    
                    if (crossCheckedAnalysis.overallSummary) {
                      analysis.overallSummary = crossCheckedAnalysis.overallSummary;
                    }
                    
                    console.log("Analysis updated with Perplexity cross-check data");
                  } catch (jsonParseError) {
                    console.error("Failed to parse Perplexity JSON response:", jsonParseError);
                    
                    // Log specific error information
                    if (jsonParseError instanceof SyntaxError) {
                      console.error(`JSON syntax error: ${jsonParseError.message}`);
                      
                      // If error mentions a position, log the context around that position
                      const match = jsonParseError.message.match(/position (\d+)/);
                      if (match && match[1]) {
                        const position = parseInt(match[1]);
                        const start = Math.max(0, position - 20);
                        const end = Math.min(jsonContent.length, position + 20);
                        console.error(`JSON error context: "${jsonContent.substring(start, position)}[ERROR HERE]${jsonContent.substring(position, end)}"`);
                      }
                    }
                    
                    // Fall back to manual JSON extraction as a last resort
                    try {
                      console.log("Trying alternative JSON parsing approach");
                      
                      // Look for well-formed JSON object pattern
                      const objectMatch = jsonContent.match(/(\{[\s\S]*\})/);
                      if (objectMatch && objectMatch[1]) {
                        const potentialJson = objectMatch[1];
                        console.log("Found potential JSON object:", potentialJson.substring(0, 100) + "...");
                        
                        // Try to parse this extracted object
                        const fallbackAnalysis = JSON.parse(potentialJson);
                        console.log("Successfully parsed JSON using fallback extraction");
                        
                        // Update analysis with this extracted data
                        if (fallbackAnalysis.overallScore) {
                          analysis.overallScore = fallbackAnalysis.overallScore;
                          console.log("Updated overallScore using fallback approach");
                        }
                      }
                    } catch (fallbackError) {
                      console.error("Fallback JSON parsing also failed:", fallbackError);
                      console.log("Using original analysis without modifications");
                    }
                  }
                } else {
                  console.log("Perplexity response didn't contain expected data structure");
                }
              } catch (perplexityProcessingError) {
                console.error("Error processing Perplexity response:", perplexityProcessingError);
                console.log("Using original analysis without modifications");
              }
            }
          } catch (perplexityError) {
            console.error("Error during Perplexity cross-check:", perplexityError);
            console.log("Proceeding with original analysis due to Perplexity error");
          }
        } else {
          console.log("No Perplexity API key found, skipping cross-check");
        }
        
        console.log("Saving results to database");
        
        // Save analysis results to database
        const companyId = await saveAnalysisResults(supabase, analysis, report);

        console.log(`Analysis complete, created company with ID: ${companyId}`);
        
        // Try to trigger the Perplexity research and details extraction concurrently
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
