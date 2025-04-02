
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@1.0.0";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Create a Supabase client with the service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Set up the listener for realtime events
serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the submission data from the request
    const { record } = await req.json();

    // Log the received data for debugging
    console.log("Received submission data:", record);

    if (!record) {
      return new Response(
        JSON.stringify({ error: "No record data provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract the submitter email from the record
    const submitterEmail = record.submitter_email;
    if (!submitterEmail) {
      return new Response(
        JSON.stringify({ error: "No submitter email found in record" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send confirmation email
    const data = await resend.emails.send({
      from: "PanScience Innovations <onboarding@resend.dev>",
      to: submitterEmail,
      subject: "Submission Received - Thank You!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h1 style="color: #333;">Thank You for Your Submission!</h1>
          <p>Dear Applicant,</p>
          <p>We have received your submission for Bhabha Atomic Research Centre's Lab to Launch Programme. Our team will review your application and get back to you shortly.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br/>Team PSI</p>
        </div>
      `,
    });

    console.log("Email sent result:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent successfully",
        emailResult: data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred while sending the confirmation email" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
