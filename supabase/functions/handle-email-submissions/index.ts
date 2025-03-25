
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
    
    // Parse the webhook data
    const reqText = await req.text();
    console.log("Raw webhook payload:", reqText);
    
    // Check if we're dealing with a URL-encoded format or JSON
    let payload: WebhookPayload;
    
    if (reqText.includes('=') && (reqText.includes('mail_attachment') || reqText.includes('mail_sender'))) {
      // Handle URL-encoded format
      console.log("Detected URL-encoded format with nested arrays");
      
      // Remove leading ? if present
      const cleanText = reqText.startsWith('?') ? reqText.substring(1) : reqText;
      
      try {
        // Parse URL-encoded data
        const params = new URLSearchParams(cleanText);
        
        // Get all parameter keys to identify array indices
        const paramKeys = Array.from(params.keys());
        
        // Extract the id and basic fields first
        const id = params.get('id');
        if (!id) {
          console.error("Missing required ID field");
          return new Response(
            JSON.stringify({ 
              error: "Missing required ID field",
              params: Object.fromEntries(params),
              rawText: reqText
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Extracted ID:", id);
        
        // Extract other basic fields
        const received_at = params.get('received_at') || '';
        const processed_at = params.get('processed_at') || '';
        const company_name = params.get('company_name') || '';
        
        // Extract mail_attachment data by finding all keys that match the pattern
        const mailAttachments: MailAttachment[] = [];
        const attachmentIndices = new Set<number>();
        
        paramKeys.forEach(key => {
          if (key.startsWith('mail_attachment[')) {
            // Extract the index from the key, e.g. "mail_attachment[0][key_0]" → 0
            const indexMatch = key.match(/mail_attachment\[(\d+)\]/);
            if (indexMatch && indexMatch[1]) {
              attachmentIndices.add(parseInt(indexMatch[1]));
            }
          }
        });
        
        // Now process each index we found
        attachmentIndices.forEach(index => {
          const key0 = params.get(`mail_attachment[${index}][key_0]`);
          const key1 = params.get(`mail_attachment[${index}][key_1]`);
          
          if (key0 && key1) {
            mailAttachments.push({
              key_0: key0,
              key_1: key1
            });
          }
        });
        
        console.log("Extracted attachments:", mailAttachments);
        
        // Extract mail_sender data similarly
        const mailSenders: MailSender[] = [];
        const senderIndices = new Set<number>();
        
        paramKeys.forEach(key => {
          if (key.startsWith('mail_sender[')) {
            const indexMatch = key.match(/mail_sender\[(\d+)\]/);
            if (indexMatch && indexMatch[1]) {
              senderIndices.add(parseInt(indexMatch[1]));
            }
          }
        });
        
        senderIndices.forEach(index => {
          const name = params.get(`mail_sender[${index}][name]`);
          const address = params.get(`mail_sender[${index}][address]`);
          
          if (address) { // Address is required, name can be optional
            mailSenders.push({
              name: name || '',
              address: address
            });
          }
        });
        
        console.log("Extracted senders:", mailSenders);
        
        // Construct the payload object
        payload = {
          id,
          received_at,
          processed_at,
          company_name,
          mail_attachment: mailAttachments.length > 0 ? mailAttachments : undefined,
          mail_sender: mailSenders.length > 0 ? mailSenders : []
        };
        
        // Make sure we have at least one sender
        if (payload.mail_sender.length === 0) {
          return new Response(
            JSON.stringify({ 
              error: "No valid mail sender found",
              params: Object.fromEntries(params)
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Parsed URL-encoded payload:", JSON.stringify(payload, null, 2));
      } catch (parseError) {
        console.error("Error parsing URL-encoded data:", parseError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to parse URL-encoded data", 
            details: parseError.message,
            rawText: reqText
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Try to parse as JSON if not URL-encoded
      try {
        payload = JSON.parse(reqText);
        console.log("Parsed JSON payload:", JSON.stringify(payload, null, 2));
      } catch (parseError) {
        console.error("Error parsing payload as JSON:", parseError);
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
    
    // Prepare the data for insertion into our new table
    const insertData = {
      external_id: payload.id,
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
