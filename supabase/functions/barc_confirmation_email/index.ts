
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

// Template function for email content
function getEmailTemplate(companyName: string, submissionDate: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #333; text-align: center;">Submission Received</h1>
      <p>Thank you for your submission to BARC.</p>
      <p>We have received your pitch deck and information. Our team will review your submission and get back to you shortly.</p>
      <p>Submission Details:</p>
      <ul>
        <li><strong>Company Name:</strong> ${companyName || 'Not provided'}</li>
        <li><strong>Submission Date:</strong> ${submissionDate}</li>
      </ul>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 12px;">© 2024 BARC. All rights reserved.</p>
      </div>
    </div>
  `;
}

// Function to send an email
async function sendEmail(to: string, subject: string, htmlContent: string) {
  console.log(`Sending email to: ${to}`);
  
  try {
    const emailResponse = await resend.emails.send({
      from: "BARC <onboarding@resend.dev>", // Update with your verified domain
      to: [to],
      subject: subject,
      html: htmlContent
    });
    
    console.log('Email sent successfully:', emailResponse);
    return { success: true, data: emailResponse };
  } catch (emailError) {
    console.error('Error sending confirmation email:', emailError);
    return { success: false, error: emailError };
  }
}

// Process a specific submission by ID
async function processSubmission(id: string) {
  console.log(`Processing submission with ID: ${id}`);
  
  try {
    // Get the submission from the database
    const { data: submission, error } = await supabase
      .from('public_form_submissions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching submission:', error);
      return { success: false, error };
    }
    
    if (!submission) {
      console.log('No submission found with this ID');
      return { success: false, error: 'Submission not found' };
    }
    
    // Check if we have an email to send to
    const submitterEmail = submission.submitter_email;
    if (!submitterEmail) {
      console.log('No submitter email found in the submission, skipping email send');
      return { success: false, error: 'No email address found' };
    }
    
    // Send the email
    const emailResult = await sendEmail(
      submitterEmail,
      "Your BARC Submission Has Been Received",
      getEmailTemplate(submission.title, new Date(submission.created_at).toLocaleDateString())
    );
    
    return emailResult;
  } catch (error) {
    console.error('Error processing submission:', error);
    return { success: false, error };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Starting barc_confirmation_email function");
    const requestId = crypto.randomUUID();
    console.log(`Request ID: ${requestId}`);

    // Get the request body
    let requestData = {};
    try {
      requestData = await req.json();
      console.log(`Request data (${requestId}):`, requestData);
    } catch (e) {
      console.log(`No request body or invalid JSON (${requestId})`);
    }

    // Check if we're in test mode
    if (requestData && 'testMode' in requestData && requestData.testMode === true) {
      console.log(`Test mode activated (${requestId})`);
      
      const testEmail = requestData.testEmail || 'test@example.com';
      const testCompanyName = requestData.testCompanyName || 'Test Company';
      
      // Send a test email
      const emailResult = await sendEmail(
        testEmail,
        "BARC Test Email",
        getEmailTemplate(testCompanyName, new Date().toLocaleDateString())
      );
      
      return new Response(
        JSON.stringify({ 
          success: emailResult.success, 
          message: emailResult.success ? "Test email sent successfully" : "Failed to send test email",
          data: emailResult.data,
          error: emailResult.error,
          requestId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: emailResult.success ? 200 : 500
        }
      );
    }
    
    // Check if we're processing a specific submission
    if (requestData && 'submissionId' in requestData) {
      console.log(`Processing specific submission (${requestId}): ${requestData.submissionId}`);
      
      const submissionResult = await processSubmission(requestData.submissionId);
      
      return new Response(
        JSON.stringify({ 
          success: submissionResult.success, 
          message: submissionResult.success ? "Submission processed successfully" : "Failed to process submission",
          error: submissionResult.error,
          requestId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: submissionResult.success ? 200 : 500
        }
      );
    }

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
          console.log(`New public form submission detected (${requestId}):`, payload.new.id);
          
          // Extract the submitter email
          const submitterEmail = payload.new.submitter_email;
          
          if (!submitterEmail) {
            console.log(`No submitter email found in the submission (${requestId}), skipping email send`);
            return;
          }
          
          console.log(`Sending confirmation email to (${requestId}): ${submitterEmail}`);
          
          // Send the email
          await sendEmail(
            submitterEmail,
            "Your BARC Submission Has Been Received",
            getEmailTemplate(payload.new.title, new Date(payload.new.created_at).toLocaleDateString())
          );
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status (${requestId}):`, status);
      });
    
    // Function can be invoked to initialize the subscription
    // The main work happens in the subscription handler above
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email handler initialized",
        requestId
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
