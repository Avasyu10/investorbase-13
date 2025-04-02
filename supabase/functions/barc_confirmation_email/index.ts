
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Received request:", JSON.stringify(requestData));

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Check for required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    if (!resendApiKey) {
      throw new Error("Missing Resend API key");
    }

    console.log("Resend API key exists:", !!resendApiKey);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is a direct test email request
    if (requestData.testEmail) {
      console.log("Sending direct test email");
      
      const submitterEmail = requestData.submitter_email;
      const title = requestData.title || "Test Company";
      
      if (!submitterEmail) {
        throw new Error("No submitter email provided for test");
      }

      // Initialize Resend
      const resend = new Resend(resendApiKey);

      // Format the email content
      const companyName = title || "your company";
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h1 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Test Email - Thank You for Your Submission</h1>
          <p>Hello,</p>
          <p>This is a <strong>TEST EMAIL</strong> from the BARC confirmation email system.</p>
          <p>In a real scenario, we would have received your pitch deck for <strong>${companyName}</strong> and our team would review it shortly.</p>
          <p>This email confirms that your email configuration is working correctly.</p>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 14px;">
            Best regards,<br>
            The InvestorBase Team
          </p>
        </div>
      `;

      // Send the email
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "InvestorBase <onboarding@resend.dev>",
        to: [submitterEmail],
        subject: `[TEST] We've Received Your Pitch Deck - ${companyName}`,
        html: emailHtml,
      });

      if (emailError) {
        throw new Error(`Error sending test email: ${emailError.message}`);
      }

      console.log("Test email sent successfully:", emailData);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Test email sent successfully",
          emailId: emailData?.id
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Process a submission ID
    const { submissionId } = requestData;
    
    if (!submissionId) {
      throw new Error("No submission ID provided");
    }

    // Fetch the submission data
    const { data: submission, error: fetchError } = await supabase
      .from("public_form_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error(`Error fetching submission: ${fetchError?.message || "Submission not found"}`);
    }

    if (!submission.submitter_email) {
      throw new Error("Submission has no submitter email");
    }

    console.log(`Sending confirmation email to ${submission.submitter_email}`);

    // Initialize Resend
    const resend = new Resend(resendApiKey);

    // Format the email content
    const companyName = submission.title || "your company";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h1 style="color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Thank You for Your Submission</h1>
        <p>Hello,</p>
        <p>We've received your pitch deck for <strong>${companyName}</strong> and our team will review it shortly.</p>
        <p>Here's what to expect next:</p>
        <ul>
          <li>Our AI system will analyze your pitch deck</li>
          <li>Our team will review the analysis and provide feedback</li>
          <li>We'll reach out if we need additional information</li>
        </ul>
        <p>Thank you for considering us as a potential partner in your journey.</p>
        <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 14px;">
          Best regards,<br>
          The InvestorBase Team
        </p>
      </div>
    `;

    // Send the email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "InvestorBase <onboarding@resend.dev>",
      to: [submission.submitter_email],
      subject: `We've Received Your Pitch Deck - ${companyName}`,
      html: emailHtml,
    });

    if (emailError) {
      throw new Error(`Error sending email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailData);

    // Update the submission with email status
    const { error: updateError } = await supabase
      .from("public_form_submissions")
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_response: emailData
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission with email status:", updateError);
      // Continue execution even if update fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent successfully",
        emailId: emailData?.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("Error in barc_confirmation_email function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
