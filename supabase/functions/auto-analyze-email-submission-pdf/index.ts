
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
  
  // Just return a simple success message
  return new Response(
    JSON.stringify({ 
      message: "Hello from auto-analyze-email-submission-pdf", 
      success: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
});
