
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Received OPTIONS request, sending CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Hello from auto-analyze-email-submission-pdf");
  
  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData));
    
    // Process the submission ID if provided
    const submissionId = requestData.submissionId;
    if (submissionId) {
      console.log(`Processing submission ID: ${submissionId}`);
      // Here you would add the actual analysis logic
    }
    
    // Just return a simple success message
    return new Response(
      JSON.stringify({ 
        message: "Hello from auto-analyze-email-submission-pdf", 
        success: true,
        receivedData: requestData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
