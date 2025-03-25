
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define the expected webhook payload structure
interface MailAttachment {
  key_0: string; // The file name
  key_1: string; // The download link
}

interface MailSender {
  name: string;
  address: string;
}

interface WebhookPayload {
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
    
    // Parse the webhook data
    const reqText = await req.text();
    console.log("Raw webhook payload:", reqText);
    
    // Check if we're dealing with a URL-encoded format or JSON
    let payload: WebhookPayload;
    
    if (reqText.startsWith('?') || reqText.includes('&')) {
      // Handle URL-encoded format
      console.log("Detected URL-encoded format");
      
      // Parse URL-encoded data
      const params = new URLSearchParams(reqText.startsWith('?') ? reqText.substring(1) : reqText);
      
      // Extract mail_attachment data
      const mail_attachment: MailAttachment[] = [];
      let index = 0;
      while (params.has(`mail_attachment[${index}][key_0]`)) {
        mail_attachment.push({
          key_0: params.get(`mail_attachment[${index}][key_0]`) || '',
          key_1: params.get(`mail_attachment[${index}][key_1]`) || ''
        });
        index++;
      }
      
      // Extract mail_sender data
      const mail_sender: MailSender[] = [];
      index = 0;
      while (params.has(`mail_sender[${index}][name]`)) {
        mail_sender.push({
          name: params.get(`mail_sender[${index}][name]`) || '',
          address: params.get(`mail_sender[${index}][address]`) || ''
        });
        index++;
      }
      
      // Construct the payload object
      payload = {
        received_at: params.get('received_at') || '',
        processed_at: params.get('processed_at') || '',
        company_name: params.get('company_name') || '',
        mail_attachment: mail_attachment.length > 0 ? mail_attachment : undefined,
        mail_sender
      };
      
      console.log("Parsed URL-encoded payload:", JSON.stringify(payload, null, 2));
    } else {
      // Try to parse as JSON if not URL-encoded
      try {
        payload = JSON.parse(reqText);
        console.log("Parsed JSON payload:", JSON.stringify(payload, null, 2));
      } catch (parseError) {
        console.error("Error parsing payload:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Invalid payload format", 
            details: parseError.message, 
            raw: reqText 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate sender information
    if (!payload.mail_sender || payload.mail_sender.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing sender information",
          payload: payload
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract sender information
    const sender = payload.mail_sender[0];
    const senderName = sender.name || '';
    const senderEmail = sender.address;
    
    // Prepare attachment data if available
    let attachmentName = null;
    let attachmentUrl = null;
    let hasAttachment = false;
    
    if (payload.mail_attachment && payload.mail_attachment.length > 0) {
      attachmentName = payload.mail_attachment[0].key_0 || null;
      attachmentUrl = payload.mail_attachment[0].key_1 || null;
      hasAttachment = true;
      console.log(`Found attachment: ${attachmentName}, URL: ${attachmentUrl}`);
    }

    // Format received date
    const receivedDate = payload.received_at ? 
      new Date(payload.received_at).toISOString() : 
      new Date().toISOString();
    
    // Generate a unique external_id if none was provided
    // We'll use a combination of timestamp and random string to ensure uniqueness
    const external_id = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Prepare the data for insertion into our new table
    const insertData = {
      external_id, // Add the generated external_id
      company_name: payload.company_name || null,
      received_at: receivedDate,
      processed_at: payload.processed_at ? new Date(payload.processed_at).toISOString() : null,
      sender_name: senderName,
      sender_email: senderEmail,
      attachment_name: attachmentName,
      attachment_url: attachmentUrl,
      has_attachment: hasAttachment
    };
    
    // Log the exact data structure being sent to the database
    console.log("Inserting data into email_pitch_submissions:", JSON.stringify(insertData, null, 2));

    // Insert into email_pitch_submissions table
    const { data, error } = await supabase
      .from("email_pitch_submissions")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Error inserting data:", error);
      return new Response(
        JSON.stringify({ 
          error: error.message, 
          details: error,
          insertData: insertData 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Successfully inserted email pitch submission:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data[0].id,
        message: "Email pitch submission successfully stored" 
      }),
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
