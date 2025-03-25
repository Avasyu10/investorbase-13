
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

// Constants
import { corsHeaders } from "../analyze-pdf/cors.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "Report ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing report ID: ${reportId}`);

    // Get email submission details
    const { data: emailSubmission, error: emailError } = await supabase
      .from("email_submissions")
      .select("*")
      .eq("report_id", reportId)
      .single();

    if (emailError) {
      console.error("Error fetching email submission:", emailError);
      return new Response(
        JSON.stringify({ error: `Error fetching email submission: ${emailError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailSubmission) {
      return new Response(
        JSON.stringify({ error: "Email submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found email submission: ${emailSubmission.id}`);

    // Update the report status to processing
    await supabase
      .from("reports")
      .update({ analysis_status: "processing" })
      .eq("id", reportId);

    // Download the PDF attachment
    let pdfContent;
    if (emailSubmission.attachment_url) {
      console.log(`Attempting to download PDF from: ${emailSubmission.attachment_url}`);
      
      // Get user_id from the report
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("user_id")
        .eq("id", reportId)
        .single();
        
      if (reportError) {
        console.error("Error fetching report user_id:", reportError);
        throw reportError;
      }
      
      const userId = report?.user_id;
      if (!userId) {
        throw new Error("User ID not found for this report");
      }
      
      // Download from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("report_pdfs")
        .download(`${userId}/${emailSubmission.attachment_url}`);
        
      if (fileError) {
        console.error("Error downloading PDF:", fileError);
        throw fileError;
      }
      
      pdfContent = await fileData.text();
      console.log("PDF downloaded successfully");
    } else {
      console.log("No PDF attachment found, will analyze based on email content only");
    }

    // Now invoke the standard analyze-pdf function to handle the rest of the analysis
    // This way we reuse the existing analysis logic
    console.log("Calling analyze-pdf function to complete analysis");
    const { data: analysisResult, error: analysisError } = await supabase.functions.invoke("analyze-pdf", {
      body: { 
        reportId,
        emailContent: emailSubmission.email_body,
        pdfContent: pdfContent || null,
        isEmailSubmission: true
      }
    });

    if (analysisError) {
      console.error("Error invoking analyze-pdf function:", analysisError);
      throw analysisError;
    }

    if (!analysisResult || analysisResult.error) {
      const errorMessage = analysisResult?.error || "Unknown error occurred during analysis";
      throw new Error(errorMessage);
    }

    console.log("Analysis completed successfully:", analysisResult);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-email-submission-pdf function:", error);
    
    // Update report status to failed if a reportId was provided
    try {
      const { reportId } = await req.json();
      if (reportId) {
        await supabase
          .from("reports")
          .update({
            analysis_status: "failed",
            analysis_error: error instanceof Error ? error.message : String(error)
          })
          .eq("id", reportId);
      }
    } catch (e) {
      console.error("Error updating report status:", e);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
