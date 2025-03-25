
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
  console.log("Received request to handle-email-submissions");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  // Check for the authorization header
  const authHeader = req.headers.get('authorization');
  const expectedAuth = 'c3VwYWJhc2VmdW5jdGlvbnM6c3VwYWJhc2VmdW5jdGlvbnM=';
  
  console.log("Auth header received:", authHeader ? "Present" : "Missing");
  
  if (!authHeader || authHeader !== `Bearer ${expectedAuth}`) {
    console.error("Authorization failed. Expected: Bearer " + expectedAuth);
    console.error("Received:", authHeader);
    
    return new Response(
      JSON.stringify({ 
        error: "Unauthorized", 
        message: "Missing or invalid authorization header",
        note: "Please include 'Authorization: Bearer c3VwYWJhc2VmdW5jdGlvbnM6c3VwYWJhc2VmdW5jdGlvbnM=' in your request headers"
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  // Initialize Supabase client with the service role key for admin privileges
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the raw request body as text
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);
    
    let payload: WebhookPayload;
    
    try {
      // Parse the webhook payload
      payload = JSON.parse(rawBody);
      console.log("Parsed webhook payload:", payload);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload", details: parseError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!payload.id || !payload.mail_sender || payload.mail_sender.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract the sender's email from the payload
    const sender = payload.mail_sender[0];
    const fromEmail = sender.address;

    const receivedAt = payload.received_at ? payload.received_at.replace(' ', 'T') + 'Z' : new Date().toISOString();
    
    // Prepare attachment data if available
    let attachmentUrl = null;
    let hasAttachments = false;
    
    if (payload.mail_attachment && payload.mail_attachment.length > 0) {
      // Assuming key_1 is the attachment URL
      attachmentUrl = payload.mail_attachment[0].key_1;
      hasAttachments = true;
    }

    // Insert into email_submissions table
    const { data, error } = await supabase
      .from("email_submissions")
      .insert({
        from_email: fromEmail,
        to_email: "pitchdeck@example.com", // Replace with actual destination email
        subject: payload.company_name || "Pitch Deck Submission",
        email_body: `Email from ${fromEmail} received at ${payload.received_at}`,
        has_attachments: hasAttachments,
        attachment_url: attachmentUrl,
        received_at: payload.received_at || new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
