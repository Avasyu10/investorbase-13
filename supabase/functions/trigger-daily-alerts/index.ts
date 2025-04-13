
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    
    // Call the send-alert-emails function for end of day alerts
    const endOfDayResponse = await supabase.functions.invoke("send-alert-emails", {
      body: { alertType: "endOfDay" },
    });
    
    console.log("End of day alerts response:", endOfDayResponse);
    
    // Call the send-alert-emails function for custom alerts
    const customAlertsResponse = await supabase.functions.invoke("send-alert-emails", {
      body: { alertType: "custom" },
    });
    
    console.log("Custom alerts response:", customAlertsResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        endOfDay: endOfDayResponse,
        customAlerts: customAlertsResponse
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error triggering alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
