
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Received OPTIONS request, sending CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Received request to auto-analyze-email-submission-pdf");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
      console.error("Supabase credentials are not configured");
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials are not configured',
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse request data - can be from a webhook or direct call
    let submissionId;
    let requestData;
    try {
      // First try to parse as JSON (for direct API calls)
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
      submissionId = requestData.submissionId || requestData.id;
      console.log("Extracted submission ID:", submissionId);
    } catch (e) {
      console.log("Error parsing JSON:", e.message);
      // If JSON parsing fails, try to get from URL params (for webhook triggers)
      const url = new URL(req.url);
      submissionId = url.searchParams.get('id');
      console.log("Using URL param ID:", submissionId);
    }
    
    // Validate submission ID
    if (!submissionId) {
      console.error("Missing email submission ID in request");
      return new Response(
        JSON.stringify({ error: "Email submission ID is required", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing email submission ${submissionId} for auto-analysis check`);
    
    // Create a service client for direct database access
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get the email submission record
    console.log("Fetching email submission from database...");
    const { data: emailSubmission, error: emailError } = await serviceClient
      .from('email_submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();
      
    if (emailError) {
      console.error("Error fetching email submission:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!emailSubmission) {
      console.error("Email submission not found");
      return new Response(
        JSON.stringify({ error: "Email submission not found", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log("Found email submission:", JSON.stringify(emailSubmission));
    
    // No attachment or no report ID means nothing to analyze
    if (!emailSubmission.attachment_url || !emailSubmission.report_id) {
      console.log("Email submission has no attachment or report ID, skipping");
      return new Response(
        JSON.stringify({ 
          message: "Email submission has no attachment or report ID, skipping",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Get the report associated with this email submission
    console.log(`Fetching report with ID ${emailSubmission.report_id}...`);
    const { data: report, error: reportError } = await serviceClient
      .from('reports')
      .select('*')
      .eq('id', emailSubmission.report_id)
      .maybeSingle();
      
    if (reportError) {
      console.error("Error fetching report:", reportError);
      return new Response(
        JSON.stringify({ error: reportError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!report) {
      console.error("Report not found");
      return new Response(
        JSON.stringify({ error: "Report not found", success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log("Found associated report:", JSON.stringify(report));
    
    // Already analyzed or processing
    if (report.analysis_status !== 'manual_pending' && report.analysis_status !== 'pending') {
      console.log(`Report already in status: ${report.analysis_status}, skipping`);
      return new Response(
        JSON.stringify({ 
          message: `Report already in status: ${report.analysis_status}, skipping`,
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check the to_email to find the corresponding investor_pitch_email
    if (!emailSubmission.to_email) {
      console.log("Email submission has no recipient email");
      return new Response(
        JSON.stringify({ 
          message: "Email submission has no recipient email",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Find the investor_pitch_email record
    console.log(`Looking for investor pitch email with address: ${emailSubmission.to_email}`);
    const { data: pitchEmail, error: pitchEmailError } = await serviceClient
      .from('investor_pitch_emails')
      .select('*')
      .eq('email_address', emailSubmission.to_email)
      .maybeSingle();
      
    if (pitchEmailError) {
      console.error("Error fetching investor pitch email:", pitchEmailError);
      return new Response(
        JSON.stringify({ error: pitchEmailError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    if (!pitchEmail) {
      console.log("No matching investor pitch email found");
      return new Response(
        JSON.stringify({ 
          message: "No matching investor pitch email found",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check auto_analyze setting
    const autoAnalyze = pitchEmail.auto_analyze || false;
    console.log(`Email auto_analyze setting: ${autoAnalyze}`);
    
    if (!autoAnalyze) {
      console.log("Auto-analyze is disabled for this email, skipping analysis");
      return new Response(
        JSON.stringify({ 
          message: "Auto-analyze is disabled for this email, skipping analysis",
          success: true,
          autoAnalyze: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Check if this corresponds to a new addition in public_form_submissions
    const { data: publicFormSubmissions, error: publicFormError } = await serviceClient
      .from('public_form_submissions')
      .select('*')
      .eq('report_id', report.id)
      .limit(1);
      
    if (publicFormError) {
      console.error("Error checking public form submissions:", publicFormError);
      // Non-blocking, continue with analysis
    } else if (publicFormSubmissions && publicFormSubmissions.length > 0) {
      console.log("database updated"); // Only print this when there's a match in public_form_submissions
    }
    
    // Update status to pending if it was manual_pending
    if (report.analysis_status === 'manual_pending') {
      console.log("Updating report status from manual_pending to pending");
      const { error: updateError } = await serviceClient
        .from('reports')
        .update({ analysis_status: 'pending' })
        .eq('id', report.id);
        
      if (updateError) {
        console.error("Error updating report status:", updateError);
        // Non-blocking, continue with analysis
      } else {
        console.log("Successfully updated report status");
      }
    }
    
    // Proceed with analysis - call the analyze-pdf function
    console.log("Calling analyze-pdf function with report ID:", report.id);
    
    // Call the analyze-pdf function with the report ID
    // Use anon key since we're running this as a service
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ reportId: report.id })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from analyze-pdf: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Error from analyze-pdf: ${response.status}`,
            details: errorText,
            success: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }
      
      const analysisResult = await response.json();
      
      console.log("Analysis initiated successfully:", analysisResult);
      
      return new Response(
        JSON.stringify({ 
          message: "Analysis initiated successfully", 
          companyId: analysisResult.companyId,
          success: true,
          autoAnalyze: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (analysisError) {
      console.error("Error calling analyze-pdf:", analysisError);
      return new Response(
        JSON.stringify({ 
          error: "Error calling analyze-pdf", 
          details: analysisError instanceof Error ? analysisError.message : String(analysisError),
          success: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred", 
        details: error instanceof Error ? error.message : String(error),
        success: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
