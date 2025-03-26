import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Initialize diagnostics
  let diagnostics = {
    requestMethod: req.method,
    requestURL: req.url,
    requestHeaders: {},
    requestBody: null,
    processingStage: "initializing",
    error: null
  };
  
  console.log("=========== AUTO-ANALYZE FUNCTION STARTED v4 (DEBUG) ===========");
  
  try {
    // First, log the basic request information
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    // Log all request headers for debugging
    const headers = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("Request headers:", JSON.stringify(headers));
    diagnostics.requestHeaders = headers;
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log("Handling CORS preflight request");
      return new Response(null, { 
        headers: corsHeaders,
        status: 204
      });
    }
    
    console.log("Processing POST request");
    diagnostics.processingStage = "reading_request_body";
    
    // Check content type
    const contentType = req.headers.get('content-type') || '';
    console.log("Content-Type:", contentType);
    
    // Read and log the request body
    let bodyText = '';
    try {
      bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      diagnostics.requestBody = bodyText;
      
      // Check if the body is empty
      if (!bodyText || bodyText.trim() === '') {
        console.error("Request body is empty");
        throw new Error("Request body is empty");
      }
    } catch (bodyError) {
      console.error("Error reading request body:", bodyError);
      diagnostics.error = `Error reading request body: ${bodyError.message}`;
      return new Response(JSON.stringify({ 
        error: "Failed to read request body",
        success: false,
        diagnostics
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }
    
    // Parse request body
    diagnostics.processingStage = "parsing_request_body";
    let submissionId;
    
    try {
      // Try to parse as JSON
      const requestBody = JSON.parse(bodyText);
      console.log("Parsed JSON body:", JSON.stringify(requestBody));
      
      // Extract the submission ID
      submissionId = requestBody.id;
      console.log(`Extracted submission ID from JSON: ${submissionId}`);
      
      if (!submissionId) {
        throw new Error("No submission ID found in request body");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
      // Try alternative parsing approaches
      try {
        // Try to parse as URL-encoded form data
        const formData = new URLSearchParams(bodyText);
        submissionId = formData.get('id');
        console.log(`Extracted submission ID from form data: ${submissionId}`);
        
        if (!submissionId) {
          throw new Error("No submission ID found in form data");
        }
      } catch (formError) {
        console.error("Form data parse error:", formError);
        diagnostics.error = `Failed to parse request body: ${parseError.message}, ${formError.message}`;
        return new Response(JSON.stringify({ 
          error: "Invalid request format. Expected JSON with 'id' field",
          success: false,
          diagnostics,
          bodyReceived: bodyText
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        });
      }
    }
    
    // Now that we have the submission ID, get the Supabase client
    diagnostics.processingStage = "initializing_supabase_client";
    console.log(`Processing email pitch submission: ${submissionId}`);
    
    // Get environment variables with explicit error handling
    console.log("Checking environment variables");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("SUPABASE_URL present:", !!SUPABASE_URL);
    console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!SUPABASE_SERVICE_ROLE_KEY);
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      diagnostics.error = "Missing environment variables";
      return new Response(JSON.stringify({ 
        error: "Server configuration error: Missing environment variables",
        success: false,
        diagnostics
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      });
    }
    
    // Create Supabase client with explicit error handling
    let serviceClient;
    try {
      console.log("Creating Supabase admin client");
      serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      console.log("Supabase client created successfully");
    } catch (clientError) {
      console.error("Error creating Supabase client:", clientError);
      diagnostics.error = `Failed to create Supabase client: ${clientError.message}`;
      return new Response(JSON.stringify({ 
        error: "Failed to initialize database client: " + clientError.message,
        success: false,
        diagnostics
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      });
    }
    
    // Start the main processing flow
    diagnostics.processingStage = "fetching_submission_data";
    try {
      console.log("Fetching email_pitch_submission with ID:", submissionId);
      const { data: submission, error: fetchError } = await serviceClient
        .from('email_pitch_submissions')
        .select('sender_email, attachment_url')
        .eq('id', submissionId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching submission:", fetchError);
        diagnostics.error = `Database fetch error: ${fetchError.message}`;
        return new Response(JSON.stringify({ 
          error: "Database error: " + fetchError.message,
          success: false,
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }
      
      if (!submission) {
        console.error("Submission not found");
        diagnostics.error = "Submission not found";
        return new Response(JSON.stringify({ 
          error: "Submission not found",
          success: false,
          submissionId,
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        });
      }
      
      console.log("Submission found:", JSON.stringify(submission));
      
      // Check if we have an attachment URL
      if (!submission.attachment_url) {
        console.error("No attachment URL found");
        diagnostics.error = "No attachment URL found";
        return new Response(JSON.stringify({ 
          error: "No attachment URL found in submission",
          success: false,
          submission: JSON.stringify(submission),
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        });
      }
      
      // Create a new report
      diagnostics.processingStage = "creating_report";
      console.log("Creating new report");
      const { data: report, error: reportError } = await serviceClient
        .from('reports')
        .insert({
          title: `Email Pitch from ${submission.sender_email}`,
          description: "Auto-generated from email pitch submission",
          pdf_url: submission.attachment_url,
          is_public_submission: true,
          analysis_status: 'pending'
        })
        .select()
        .single();
        
      if (reportError) {
        console.error("Error creating report:", reportError);
        diagnostics.error = `Failed to create report: ${reportError.message}`;
        return new Response(JSON.stringify({ 
          error: "Failed to create report: " + reportError.message,
          success: false,
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }
      
      console.log("Report created successfully:", JSON.stringify(report));
      
      // Update the email_pitch_submissions record with the report_id
      diagnostics.processingStage = "updating_submission";
      console.log("Updating email_pitch_submissions with report_id");
      const { error: updateError } = await serviceClient
        .from('email_pitch_submissions')
        .update({ report_id: report.id })
        .eq('id', submissionId);
        
      if (updateError) {
        console.error("Error updating submission:", updateError);
        diagnostics.error = `Failed to update submission: ${updateError.message}`;
        // Continue despite this error, it's not critical
      } else {
        console.log("Submission updated with report_id");
      }
      
      // Begin analysis by calling analyze-email-pitch-pdf function
      diagnostics.processingStage = "initiating_analysis";
      console.log("Initiating analysis process by calling analyze-email-pitch-pdf function");
      
      try {
        const analysisResponse = await serviceClient.functions.invoke('analyze-email-pitch-pdf', {
          body: { reportId: report.id }
        });
        
        if (analysisResponse.error) {
          console.error("Error from analyze-email-pitch-pdf function:", analysisResponse.error);
          diagnostics.error = `Analysis initiation error: ${JSON.stringify(analysisResponse.error)}`;
          
          // Update report status to indicate error
          await serviceClient
            .from('reports')
            .update({ 
              analysis_status: 'failed',
              analysis_error: `Failed to initiate analysis: ${JSON.stringify(analysisResponse.error)}`
            })
            .eq('id', report.id);
            
          // Return partial success - we created the report but analysis failed
          return new Response(JSON.stringify({ 
            success: true, 
            message: "Report created but analysis failed to start",
            reportId: report.id,
            analysisError: analysisResponse.error,
            diagnostics
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 207 // Partial success
          });
        }
        
        console.log("Analysis initiated successfully:", analysisResponse.data);
        
        // Return full success
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Report created and analysis initiated",
          reportId: report.id,
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        });
      } catch (analysisError) {
        console.error("Error initiating analysis:", analysisError);
        diagnostics.error = `Failed to initiate analysis: ${analysisError.message}`;
        
        // Update report status to indicate error
        await serviceClient
          .from('reports')
          .update({ 
            analysis_status: 'failed',
            analysis_error: `Failed to initiate analysis: ${analysisError.message}`
          })
          .eq('id', report.id);
          
        // Return partial success
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Report created but analysis failed to start",
          reportId: report.id,
          analysisError: analysisError.message,
          diagnostics
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 207 // Partial success
        });
      }
    } catch (e) {
      console.error("Unexpected error in processing flow:", e);
      diagnostics.error = `Unexpected error: ${e.message}`;
      return new Response(JSON.stringify({ 
        error: "Unexpected error: " + e.message,
        success: false,
        stack: e.stack,
        diagnostics
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      });
    }
  } catch (error) {
    // This is the final fallback for any unhandled errors
    console.error("Unhandled error in auto-analyze function:", error);
    console.error("Stack trace:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: "Fatal error: " + error.message,
      stack: error.stack,
      diagnostics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  } finally {
    console.log("=========== AUTO-ANALYZE FUNCTION COMPLETED v4 (DEBUG) ===========");
  }
});
