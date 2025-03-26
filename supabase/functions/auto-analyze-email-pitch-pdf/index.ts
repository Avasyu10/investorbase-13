
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Initialize failure flag
  let hasFailedEarly = false;
  let failureReason = '';
  let requestInfo = {};
  
  console.log("=========== AUTO-ANALYZE FUNCTION STARTED v2 ===========");
  
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
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log("Handling CORS preflight request");
      return new Response(null, { 
        headers: corsHeaders,
        status: 204
      });
    }
    
    // Parse request data with try/catch to catch any parsing errors
    let submissionId;
    let bodyText = '';
    try {
      console.log("About to read request body");
      bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      // Check if the body is empty
      if (!bodyText || bodyText.trim() === '') {
        console.error("Request body is empty");
        failureReason = 'Empty request body';
        hasFailedEarly = true;
        throw new Error("Request body is empty");
      }
      
      // Try to parse as JSON
      let requestBody;
      try {
        console.log("Attempting to parse as JSON");
        requestBody = JSON.parse(bodyText);
        console.log("Parsed JSON body:", JSON.stringify(requestBody));
        requestInfo = { requestBody };
        
        // Extract the submission ID
        submissionId = requestBody.id;
        console.log(`Extracted submission ID from JSON: ${submissionId}`);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.log("Attempting to parse body as URL-encoded");
        
        // Try to parse as URL-encoded form data
        const formData = new URLSearchParams(bodyText);
        submissionId = formData.get('id');
        console.log(`Extracted submission ID from form data: ${submissionId}`);
        requestInfo = { formData: Object.fromEntries(formData.entries()) };
        
        if (!submissionId) {
          failureReason = 'Could not parse request body as JSON or form data';
          hasFailedEarly = true;
          throw new Error("Could not extract submission ID from request body");
        }
      }
    } catch (bodyError) {
      console.error("Error accessing or parsing request body:", bodyError);
      return new Response(JSON.stringify({ 
        error: failureReason || "Invalid request format: " + bodyError.message,
        success: false,
        bodyReceived: bodyText,
        requestInfo
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }
    
    // Validate submission ID
    if (!submissionId) {
      console.error("Missing submission ID in request");
      return new Response(JSON.stringify({ 
        error: "Submission ID is required",
        success: false,
        bodyReceived: bodyText,
        requestInfo
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      });
    }
    
    console.log(`Processing email pitch submission: ${submissionId}`);
    
    // Get environment variables with explicit error handling
    console.log("Checking environment variables");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("SUPABASE_URL present:", !!SUPABASE_URL);
    console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!SUPABASE_SERVICE_ROLE_KEY);
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ 
        error: "Server configuration error: Missing environment variables",
        success: false,
        supabaseUrl: !!SUPABASE_URL,
        supabaseKey: !!SUPABASE_SERVICE_ROLE_KEY
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
      return new Response(JSON.stringify({ 
        error: "Failed to initialize database client: " + clientError.message,
        success: false
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      });
    }
    
    // A simplified flow that only creates a report for testing purposes
    try {
      console.log("Fetching email_pitch_submission with ID:", submissionId);
      const { data: submission, error: fetchError } = await serviceClient
        .from('email_pitch_submissions')
        .select('sender_email, attachment_url')
        .eq('id', submissionId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching submission:", fetchError);
        return new Response(JSON.stringify({ 
          error: "Database error: " + fetchError.message,
          success: false
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }
      
      if (!submission) {
        console.error("Submission not found");
        return new Response(JSON.stringify({ 
          error: "Submission not found",
          success: false,
          submissionId
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        });
      }
      
      console.log("Submission found:", JSON.stringify(submission));
      
      // Check if we have an attachment URL
      if (!submission.attachment_url) {
        console.error("No attachment URL found");
        return new Response(JSON.stringify({ 
          error: "No attachment URL found in submission",
          success: false,
          submission: JSON.stringify(submission)
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        });
      }
      
      // Create a new report just for testing
      console.log("Creating new report for testing");
      const { data: report, error: reportError } = await serviceClient
        .from('reports')
        .insert({
          title: `Test Report for ${submission.sender_email}`,
          description: "Auto-generated test report",
          pdf_url: submission.attachment_url,
          is_public_submission: true,  // Important: set this flag
          analysis_status: 'pending'
        })
        .select()
        .single();
        
      if (reportError) {
        console.error("Error creating report:", reportError);
        return new Response(JSON.stringify({ 
          error: "Failed to create report: " + reportError.message,
          success: false
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        });
      }
      
      console.log("Report created successfully:", JSON.stringify(report));
      
      // Update the email_pitch_submissions record with the report_id
      console.log("Updating email_pitch_submissions with report_id");
      const { error: updateError } = await serviceClient
        .from('email_pitch_submissions')
        .update({ report_id: report.id })
        .eq('id', submissionId);
        
      if (updateError) {
        console.error("Error updating submission:", updateError);
      } else {
        console.log("Submission updated with report_id");
      }
      
      // Return success without calling analyze-public-pdf for now
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Test report created successfully",
        reportId: report.id
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
      
    } catch (e) {
      console.error("Unexpected error in simplified flow:", e);
      return new Response(JSON.stringify({ 
        error: "Unexpected error: " + e.message,
        success: false,
        stack: e.stack
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
      hasFailedEarly,
      failureReason,
      stack: error.stack,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  } finally {
    console.log("=========== AUTO-ANALYZE FUNCTION COMPLETED v2 ===========");
  }
});
