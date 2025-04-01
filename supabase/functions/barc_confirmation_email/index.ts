
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Log startup to confirm deployment
console.log("=========== BARC CONFIRMATION EMAIL FUNCTION STARTING ===========");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
console.log("RESEND_API_KEY available:", !!RESEND_API_KEY);

// Initialize Resend only if we have an API key
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
console.log("Resend client initialized:", !!resend);

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Request received: ${req.method} ${req.url}`);
  
  // Log all request headers for debugging
  const headers = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log(`[${requestId}] Request headers:`, JSON.stringify(headers));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }
  
  try {
    // Log the beginning of processing
    console.log(`[${requestId}] Processing submission notification`);
    
    if (!RESEND_API_KEY || !resend) {
      const errorMsg = "RESEND_API_KEY is not configured";
      console.error(`[${requestId}] ${errorMsg}`);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Read and parse the request body
    let requestBody;
    try {
      if (req.body) {
        const bodyText = await req.text();
        console.log(`[${requestId}] Raw request body:`, bodyText);
        
        if (bodyText) {
          try {
            requestBody = JSON.parse(bodyText);
            console.log(`[${requestId}] Parsed request body:`, JSON.stringify(requestBody));
          } catch (parseError) {
            console.error(`[${requestId}] Error parsing JSON:`, parseError);
            requestBody = {}; // Fallback to empty object
          }
        } else {
          console.warn(`[${requestId}] Request body is empty`);
          requestBody = {};
        }
      } else {
        console.warn(`[${requestId}] No request body`);
        requestBody = {};
      }
    } catch (bodyError) {
      console.error(`[${requestId}] Error processing request body:`, bodyError);
      return new Response(
        JSON.stringify({ error: `Failed to read request body: ${bodyError.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Extract submission data (either from payload or params)
    const submissionId = requestBody.id || new URL(req.url).searchParams.get('id');
    const email = requestBody.email || new URL(req.url).searchParams.get('email');
    const companyName = requestBody.companyName || new URL(req.url).searchParams.get('companyName');
    
    console.log(`[${requestId}] Processing submission:`, {
      submissionId,
      email,
      companyName
    });
    
    if (!email) {
      const errorMsg = "Email is required for sending confirmation";
      console.error(`[${requestId}] ${errorMsg}`);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Send confirmation email
    console.log(`[${requestId}] Attempting to send email to: ${email}`);
    try {
      const emailResponse = await resend.emails.send({
        from: "InvestorBase <onboarding@resend.dev>",
        to: [email],
        subject: "Your Pitch Deck Submission Received!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3182ce;">Thank You for Your Submission!</h1>
            <p>We have received your pitch deck submission${companyName ? ` for <strong>${companyName}</strong>` : ''}.</p>
            <p>Our team will review your materials and get back to you soon with feedback and next steps.</p>
            <p>If you have any questions in the meantime, please don't hesitate to contact us.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
              <p style="font-size: 14px; color: #666;">Best regards,<br>The InvestorBase Team</p>
            </div>
          </div>
        `,
      });
      
      console.log(`[${requestId}] Email sent successfully:`, JSON.stringify(emailResponse));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Confirmation email sent successfully",
          data: emailResponse
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (emailError) {
      console.error(`[${requestId}] Error sending email:`, emailError);
      
      // Try to get more detailed error information
      let errorDetails = '';
      if (typeof emailError === 'object') {
        errorDetails = JSON.stringify(emailError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to send confirmation email",
          details: emailError.message || "Unknown error",
          errorObject: errorDetails
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error in confirmation email function",
        details: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  } finally {
    console.log(`[${requestId}] Request processing completed`);
  }
});
