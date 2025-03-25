
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define the expected webhook payload structure
interface MailAttachment {
  key_0: string; // Typically the file name
  key_1: string; // Typically the file URL or path
}

interface MailSender {
  name: string;
  address: string;
}

interface WebhookPayload {
  id: string;
  received_at: string;
  processed_at: string;
  company_name: string;
  mail_attachment?: MailAttachment[];
  mail_sender: MailSender[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // Initialize Supabase client with the service role key for admin privileges
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check for proper request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Log the raw request for debugging
    const reqText = await req.text();
    console.log("Raw webhook payload:", reqText);
    
    // Parse the webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(reqText);
      console.log("Parsed webhook payload:", payload);
    } catch (parseError) {
      console.error("Error parsing JSON payload:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload", details: parseError.message, raw: reqText }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!payload.id || !payload.mail_sender || payload.mail_sender.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          payload: payload,
          missingFields: [
            !payload.id ? "id" : null,
            !payload.mail_sender ? "mail_sender" : null,
            payload.mail_sender && payload.mail_sender.length === 0 ? "mail_sender empty" : null
          ].filter(Boolean)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract the sender's email from the payload
    const sender = payload.mail_sender[0];
    const fromEmail = sender.address;
    
    // Prepare attachment data if available
    let attachmentUrl = null;
    let hasAttachments = false;
    
    if (payload.mail_attachment && payload.mail_attachment.length > 0) {
      // Assuming key_1 is the attachment URL
      attachmentUrl = payload.mail_attachment[0].key_1;
      hasAttachments = true;
    }

    // The database error is likely happening here - we need to make sure the data is properly formatted
    // Convert any complex objects to strings to avoid JSON parsing issues
    const insertData = {
      from_email: fromEmail,
      to_email: "pitchdeck@example.com", // Replace with actual destination email
      subject: payload.company_name || "Pitch Deck Submission",
      email_body: `Email from ${fromEmail} received at ${payload.received_at}`,
      has_attachments: hasAttachments,
      attachment_url: attachmentUrl,
      received_at: payload.received_at || new Date().toISOString(),
    };
    
    console.log("Inserting data:", JSON.stringify(insertData));

    // Insert into email_submissions table
    const { data, error } = await supabase
      .from("email_submissions")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return new Response(
        JSON.stringify({ 
          error: error.message, 
          details: error,
          insertData: insertData // Include the data we tried to insert for debugging
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Successfully inserted email submission:", data);

    return new Response(
      JSON.stringify({ success: true, id: data[0].id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
