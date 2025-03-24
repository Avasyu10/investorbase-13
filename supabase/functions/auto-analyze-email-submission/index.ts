
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the auth context of the function
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function triggered, creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the submission ID from the request
    let submissionId;
    try {
      const requestData = await req.json();
      submissionId = requestData.submissionId;
      console.log(`Received request with data:`, requestData);
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      throw new Error("Invalid request format. Expected JSON with submissionId property.");
    }
    
    if (!submissionId) {
      console.error("Missing submission ID in request");
      throw new Error("Email submission ID is required");
    }

    console.log(`Processing email submission: ${submissionId}`);

    // Fetch the email submission data
    const { data: emailSubmission, error: emailError } = await supabase
      .from("email_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (emailError || !emailSubmission) {
      const errorMessage = emailError?.message || "Not found"; 
      console.error(`Failed to fetch email submission (ID: ${submissionId}):`, errorMessage);
      throw new Error(`Failed to fetch email submission: ${errorMessage}`);
    }

    console.log(`Found email submission: ${JSON.stringify({
      id: emailSubmission.id,
      from: emailSubmission.from_email,
      to: emailSubmission.to_email,
      subject: emailSubmission.subject?.substring(0, 30) || "No subject",
      hasAttachment: !!emailSubmission.attachment_url,
      reportId: emailSubmission.report_id
    })}`);

    // Check if this email already has a report associated
    if (emailSubmission.report_id) {
      console.log(`Email already has a report (${emailSubmission.report_id}), skipping processing`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email already processed",
          reportId: emailSubmission.report_id 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if the email has an attachment
    if (!emailSubmission.attachment_url) {
      console.log("Email has no attachment, cannot process");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email has no attachment" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    console.log(`Downloading attachment: ${emailSubmission.attachment_url}`);

    // Download the attachment from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("email_attachments")
      .download(emailSubmission.attachment_url);

    if (downloadError || !fileData) {
      console.error("Failed to download attachment:", downloadError || "File data is empty");
      throw new Error(`Failed to download attachment: ${downloadError?.message || "Not found"}`);
    }

    console.log("Successfully downloaded attachment, creating report");

    // Create a title for the report based on the email subject or a default
    const title = emailSubmission.subject 
      ? emailSubmission.subject.trim() 
      : `Email from ${emailSubmission.from_email}`;

    // Create a description from the email body
    const description = emailSubmission.email_body 
      ? `Email body: ${emailSubmission.email_body.substring(0, 500)}${emailSubmission.email_body.length > 500 ? '...' : ''}` 
      : `Email received at ${new Date(emailSubmission.received_at).toLocaleString()}`;

    console.log(`Creating report with title: ${title}`);

    // Create a new report record
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert([{
        title: title,
        description: description,
        pdf_url: emailSubmission.attachment_url,
        is_public_submission: false,
        analysis_status: "pending",
        submitter_email: emailSubmission.from_email
      }])
      .select()
      .single();

    if (reportError || !report) {
      console.error("Failed to create report:", reportError || "No report data returned");
      throw new Error(`Failed to create report: ${reportError?.message || "Unknown error"}`);
    }

    console.log(`Report created with ID: ${report.id}`);

    // Update the email submission with the report ID
    const { error: updateError } = await supabase
      .from("email_submissions")
      .update({ report_id: report.id })
      .eq("id", submissionId);

    if (updateError) {
      console.error(`Warning: Failed to update email submission with report ID: ${updateError.message}`);
    } else {
      console.log(`Successfully updated email submission ${submissionId} with report ID ${report.id}`);
    }

    // Check if we should trigger analysis automatically
    const { data: emailSettings, error: settingsError } = await supabase
      .from("investor_pitch_emails")
      .select("auto_analyze")
      .eq("email_address", emailSubmission.to_email)
      .maybeSingle();

    let autoAnalyze = false;
    
    if (!settingsError && emailSettings) {
      autoAnalyze = emailSettings.auto_analyze || false;
    }

    console.log(`Auto-analyze for ${emailSubmission.to_email} is: ${autoAnalyze}`);

    // If auto-analyze is enabled, trigger the analysis
    if (autoAnalyze) {
      console.log(`Auto-triggering analysis for report: ${report.id}`);
      
      try {
        const analyzeResponse = await supabase.functions.invoke("analyze-pdf", {
          body: { reportId: report.id }
        });
        
        if (analyzeResponse.error) {
          console.error(`Warning: Auto-analysis failed: ${analyzeResponse.error.message || JSON.stringify(analyzeResponse.error)}`);
        } else {
          console.log(`Auto-analysis initiated successfully for report ${report.id}`);
        }
      } catch (analyzeError) {
        console.error(`Warning: Failed to trigger auto-analysis:`, analyzeError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: report.id,
        autoAnalyze 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error(`Error in auto-analyze-email-submission function:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
