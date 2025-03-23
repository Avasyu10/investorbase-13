
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("Email parser webhook handler started");

// Use Deno.env to access environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("WEBHOOK_SECRET")!;

// Create Supabase client outside the handler for better performance
const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Check content type
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

    // Validate authentication
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

    // Safely read the request body
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

    // Parse JSON
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

    // Basic validation
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

    // Extract data from mailparser.io format
    console.log("Processing mailparser.io payload");
    
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
    
    // Fixed recipient 
    const toEmail = "reports@yourcompany.com";
    
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
    
    // Create email submission record first
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
    
    // Extract attachment details from new format
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
    
    // Use a background task to download and process the attachment
    // This allows us to return a response quickly to the webhook caller
    // while continuing to process the attachment in the background
    EdgeRuntime.waitUntil(processAttachment(
      attachmentUrl, 
      attachmentFilename, 
      emailSubmission.id,
      fromEmail,
      companyName
    ));
    
    // Return an immediate success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email received and processing started. Attachment download in progress.",
        emailSubmissionId: emailSubmission.id
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

// Function to handle attachment processing in the background
async function processAttachment(
  attachmentUrl: string,
  attachmentFilename: string,
  emailSubmissionId: string,
  fromEmail: string,
  companyName: string
) {
  try {
    console.log(`Background task: Starting download of attachment from: ${attachmentUrl}`);
    
    // Set a timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    // Download the attachment with timeout and retry logic
    let pdfBinary: Uint8Array | null = null;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries && !pdfBinary) {
      try {
        const response = await fetch(attachmentUrl, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/pdf',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Download failed with status: ${response.status} ${response.statusText}`);
        }
        
        // Get file as binary
        pdfBinary = new Uint8Array(await response.arrayBuffer());
        
        // If we got a zero-byte file, treat it as a failure
        if (pdfBinary.length === 0) {
          throw new Error("Downloaded file is empty (0 bytes)");
        }
        
        console.log(`Successfully downloaded attachment: ${pdfBinary.length} bytes`);
      } catch (downloadError) {
        retries++;
        console.error(`Download attempt ${retries} failed:`, downloadError);
        
        if (retries >= maxRetries) {
          throw new Error(`Failed to download attachment after ${maxRetries} attempts: ${downloadError.message}`);
        }
        
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, retries * 1000));
      } finally {
        clearTimeout(timeoutId);
      }
    }
    
    if (!pdfBinary) {
      throw new Error("Failed to download attachment");
    }
    
    // Generate a unique storage path incorporating a timestamp to avoid conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}_${attachmentFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `email_attachments/${fileName}`;
    
    console.log(`Uploading PDF to storage at path: ${storagePath}`);
    
    // Upload to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("email_attachments")
      .upload(storagePath, pdfBinary, {
        contentType: "application/pdf",
        cacheControl: "3600"
      });
      
    if (storageError) {
      console.error("Error uploading PDF to storage:", storageError);
      throw storageError;
    }
    
    console.log("PDF successfully uploaded to storage");
    
    // Update email submission with the attachment URL
    const { error: updateError } = await supabase
      .from("email_submissions")
      .update({
        attachment_url: storagePath
      })
      .eq("id", emailSubmissionId);
      
    if (updateError) {
      console.error("Error updating email submission with attachment URL:", updateError);
      throw updateError;
    }
    
    // Create a report entry as a public submission (similar to public form submissions)
    const reportTitle = `${companyName} - Email Submission`;
    const reportDescription = `Report from ${companyName} received via email`;
      
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title: reportTitle,
        description: reportDescription,
        pdf_url: storagePath,
        analysis_status: "pending",
        submitter_email: fromEmail,
        is_public_submission: true // Mark as public submission to show in dashboard
      })
      .select()
      .single();
      
    if (reportError) {
      console.error("Error creating report:", reportError);
      throw reportError;
    }
    
    console.log("Report created successfully:", report);
    
    // Now create a public form submission to connect with the dashboard UI
    const { data: publicSubmission, error: publicSubmissionError } = await supabase
      .from("public_form_submissions")
      .insert({
        title: reportTitle,
        description: reportDescription,
        form_slug: "email-submission", // Use a special form slug for email submissions
        report_id: report.id,
        pdf_url: storagePath,
        industry: null,
        company_stage: null,
        website_url: null
      });
    
    if (publicSubmissionError) {
      console.error("Error creating public submission:", publicSubmissionError);
      throw publicSubmissionError;
    }
    
    console.log("Public submission created successfully");
    
    // Update email submission record with the report_id
    const { error: emailUpdateError } = await supabase
      .from("email_submissions")
      .update({
        report_id: report.id
      })
      .eq("id", emailSubmissionId);
      
    if (emailUpdateError) {
      console.error("Error updating email submission with report_id:", emailUpdateError);
      // Continue anyway since the report is already created
    }
    
    console.log("Email submission processing completed successfully");
    
  } catch (error) {
    console.error("Error in background processing:", error);
    
    // Update email submission to indicate error
    try {
      await supabase
        .from("email_submissions")
        .update({
          email_body: `${error instanceof Error ? error.message : "Unknown error"}\n\nOriginal body: Company: ${companyName}`
        })
        .eq("id", emailSubmissionId);
    } catch (updateError) {
      console.error("Failed to update email submission with error:", updateError);
    }
  }
}
