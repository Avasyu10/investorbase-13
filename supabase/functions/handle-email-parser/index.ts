
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("Email parser webhook handler started");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log the request details to help debug
    console.log("Received request:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Check if body exists
    const contentType = req.headers.get('content-type') || '';
    console.log(`Content-Type: ${contentType}`);
    
    if (!contentType.includes('application/json')) {
      console.error("Invalid content type, expected application/json");
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the API key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET")!;

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid or missing authorization", authHeader);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Try to safely read the body content
    let bodyText = "";
    try {
      bodyText = await req.text();
      console.log("Raw request body:", bodyText);
      
      if (!bodyText || bodyText.trim() === "") {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } catch (error) {
      console.error("Error reading request body:", error);
      return new Response(
        JSON.stringify({ error: "Could not read request body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the request body as JSON
    let payload;
    try {
      payload = JSON.parse(bodyText);
      console.log("Parsed webhook payload:", JSON.stringify(payload));
    } catch (error) {
      console.error("Error parsing JSON body:", error, "Raw body:", bodyText);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Basic validation of the payload
    if (!payload || typeof payload !== "object") {
      console.error("Invalid payload format");
      return new Response(
        JSON.stringify({ error: "Invalid payload format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Extract data from the new mailparser.io format
    console.log("Processing mailparser.io payload");
    
    // Extract email data from the new format
    const mailId = payload.id || "unknown";
    const receivedAt = payload.received_at || new Date().toISOString();
    const processedAt = payload.processed_at || new Date().toISOString();
    const companyName = payload.company_name || "unknown";
    
    // Extract sender information
    let fromName = "unknown";
    let fromEmail = "unknown";
    if (payload.mail_sender && Array.isArray(payload.mail_sender) && payload.mail_sender.length > 0) {
      const sender = payload.mail_sender[0];
      fromName = sender.name || "unknown";
      fromEmail = sender.address || "unknown";
    }
    
    // Fixed recipient for now since it's not in the payload
    const toEmail = "reports@yourcompany.com"; // Can be updated later
    
    // Create a subject from companyName
    const subject = `Report from ${companyName}`;
    
    // Check for attachments
    const hasAttachments = payload.mail_attachment && 
                           Array.isArray(payload.mail_attachment) && 
                           payload.mail_attachment.length > 0;
    
    console.log("Extracted data:", {
      mailId,
      fromName,
      fromEmail,
      toEmail,
      subject,
      companyName,
      hasAttachments,
      receivedAt,
      processedAt
    });
    
    // Create email submission record
    const { data: emailSubmission, error: emailError } = await supabase
      .from("email_submissions")
      .insert({
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        email_body: `Company: ${companyName}`,
        has_attachments: hasAttachments,
        received_at: new Date(receivedAt).toISOString()
      })
      .select()
      .single();
      
    if (emailError) {
      console.error("Error creating email submission:", emailError);
      return new Response(
        JSON.stringify({ error: "Error recording email submission" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Email submission created:", emailSubmission);
    
    // If no attachments, return early
    if (!hasAttachments) {
      console.log("No attachments found in email");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email recorded, but no attachments to process",
          emailSubmissionId: emailSubmission.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Get the first attachment
    const attachment = payload.mail_attachment[0];
    console.log("Processing attachment:", attachment);
    
    // The attachment format is now different
    // attachment is an object with keys like key_0 (filename) and key_1 (url)
    const attachmentUrl = attachment.key_1 || "";
    const attachmentFilename = attachment.key_0 || "report.pdf";
    
    if (!attachmentUrl) {
      console.error("Attachment URL is missing");
      return new Response(
        JSON.stringify({ error: "Attachment URL is missing" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Download the attachment from the provided URL
    console.log(`Downloading attachment from: ${attachmentUrl}`);
    let response;
    try {
      response = await fetch(attachmentUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      return new Response(
        JSON.stringify({ error: "Error downloading attachment" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Get the attachment content as binary
    const pdfBinary = new Uint8Array(await response.arrayBuffer());
    
    // Generate a unique filename
    const fileName = `${Date.now()}_${attachmentFilename}`;
    
    // Upload the PDF to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("report_pdfs")
      .upload(fileName, pdfBinary, {
        contentType: "application/pdf",
        cacheControl: "3600"
      });
      
    if (storageError) {
      console.error("Error uploading PDF to storage:", storageError);
      return new Response(
        JSON.stringify({ error: "Error uploading PDF" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create report entry in database
    const reportTitle = companyName || "Report";
    const reportDescription = `Report for ${companyName} received at ${receivedAt}`;
      
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title: reportTitle,
        description: reportDescription,
        pdf_url: fileName,
        analysis_status: "pending", // Start as pending
        submitter_email: fromEmail
      })
      .select()
      .single();
      
    if (reportError) {
      console.error("Error creating report:", reportError);
      return new Response(
        JSON.stringify({ error: "Error creating report" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Update email submission record with the report_id
    const { error: updateError } = await supabase
      .from("email_submissions")
      .update({
        report_id: report.id
      })
      .eq("id", emailSubmission.id);
      
    if (updateError) {
      console.error("Error updating email submission with report_id:", updateError);
      // Continue anyway since the report is already created
    }
    
    // Optionally trigger analysis process
    try {
      // Call the analyze-pdf function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-pdf",
        {
          body: { reportId: report.id }
        }
      );
      
      if (analysisError) {
        console.error("Error starting analysis:", analysisError);
        // Update report status to indicate analysis failed to start
        await supabase
          .from("reports")
          .update({
            analysis_status: "error",
            analysis_error: "Failed to start analysis"
          })
          .eq("id", report.id);
      } else {
        console.log("Analysis started successfully");
      }
    } catch (analysisError) {
      console.error("Exception when starting analysis:", analysisError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: report.id,
        emailSubmissionId: emailSubmission.id,
        message: "Email processed and report created successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
