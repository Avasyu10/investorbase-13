
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { Resend } from "npm:resend@2.0.0";

// Configure Resend API
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(resendApiKey);

// Configure Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Starting barc_confirmation_email function");
    console.log("Resend API Key available:", !!resendApiKey);
    console.log("Supabase URL:", supabaseUrl);
    console.log("Supabase Service Key available:", !!supabaseServiceKey);

    // Set up realtime subscription to public_form_submissions table
    const channel = supabase
      .channel('public_form_submissions_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'public_form_submissions'
        },
        async (payload) => {
          console.log('New public form submission detected:', payload.new.id);
          
          // Extract the submitter email
          const submitterEmail = payload.new.submitter_email;
          
          if (!submitterEmail) {
            console.log('No submitter email found in the submission, skipping email send');
            return;
          }
          
          console.log(`Sending confirmation email to: ${submitterEmail}`);
          
          try {
            // Send the confirmation email using Resend
            const emailResponse = await resend.emails.send({
              from: "BARC <onboarding@resend.dev>", // Update with your verified domain
              to: [submitterEmail],
              subject: "Your BARC Submission Has Been Received",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                  <h1 style="color: #333; text-align: center;">Submission Received</h1>
                  <p>Thank you for your submission to BARC.</p>
                  <p>We have received your pitch deck and information. Our team will review your submission and get back to you shortly.</p>
                  <p>Submission Details:</p>
                  <ul>
                    <li><strong>Company Name:</strong> ${payload.new.title || 'Not provided'}</li>
                    <li><strong>Submission Date:</strong> ${new Date(payload.new.created_at).toLocaleDateString()}</li>
                  </ul>
                  <p>If you have any questions, please don't hesitate to contact us.</p>
                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #666; font-size: 12px;">© 2024 BARC. All rights reserved.</p>
                  </div>
                </div>
              `
            });
            
            console.log('Email send response:', JSON.stringify(emailResponse));
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            if (emailError instanceof Error) {
              console.error('Error message:', emailError.message);
              console.error('Error stack:', emailError.stack);
            }
            console.error('Error details:', JSON.stringify(emailError, null, 2));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    // Function can be invoked to initialize the subscription
    // The main work happens in the subscription handler above
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email handler initialized" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in barc_confirmation_email function:", error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 500 
      }
    );
  }
});
