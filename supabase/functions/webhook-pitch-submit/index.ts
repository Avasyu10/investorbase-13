
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Define CORS headers to allow the webhook to be called from anywhere
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Validate the webhook secret (for security)
const validateWebhookSecret = (request: Request): boolean => {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('WEBHOOK_SECRET is not set');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedSecret = authHeader.substring(7); // Remove 'Bearer ' prefix
  return providedSecret === webhookSecret;
};

// Function to extract PDF URL from form data (if available)
const extractPdfUrl = (formData: any): string | null => {
  if (formData.pdfUrl) return formData.pdfUrl;
  if (formData.fileUrl) return formData.fileUrl;
  
  // Some form providers might nest the data
  if (formData.submission?.pdfUrl) return formData.submission.pdfUrl;
  if (formData.submission?.fileUrl) return formData.submission.fileUrl;
  if (formData.data?.pdfUrl) return formData.data.pdfUrl;
  if (formData.data?.fileUrl) return formData.data.fileUrl;
  
  return null;
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse the JSON body (assuming the form sends JSON)
    const contentType = req.headers.get('content-type') || '';
    let formData: any;

    if (contentType.includes('application/json')) {
      formData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formParams = await req.formData();
      formData = Object.fromEntries(formParams.entries());
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported Content-Type' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Received webhook data:', JSON.stringify(formData));

    // Validate required fields
    const companyName = formData.companyName || formData.company || formData.title || 'Unnamed Company';
    const description = formData.description || formData.brief || formData.about || '';
    const pdfUrl = extractPdfUrl(formData);

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: 'PDF URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create a system user account for the webhook if it doesn't exist
    const systemUserId = Deno.env.get('SYSTEM_USER_ID');
    let userId = systemUserId;

    if (!userId) {
      // Create a system user if needed
      console.log('No system user ID found, creating a new system user');
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: `webhook-system-${Date.now()}@example.com`,
        password: crypto.randomUUID(),
        email_confirm: true
      });

      if (userError) {
        console.error('Error creating system user:', userError);
        throw userError;
      }

      userId = userData.user.id;
      console.log('Created system user with ID:', userId);
    }

    // Create the report record in the database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([{
        title: companyName,
        description,
        pdf_url: pdfUrl,
        user_id: userId,
        analysis_status: 'pending'
      }])
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report record:', reportError);
      throw reportError;
    }

    console.log('Created report record:', report);

    // Queue the report for analysis
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-pdf', {
        body: { reportId: report.id }
      });

      if (analysisError) {
        console.error('Error queuing analysis:', analysisError);
        throw analysisError;
      }

      console.log('Analysis queued:', analysisData);
    } catch (analysisError) {
      console.error('Error invoking analyze-pdf function:', analysisError);
      // We don't want to fail the webhook if analysis queueing fails
      // Just log the error and continue
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Pitch deck submission received and queued for analysis',
      reportId: report.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
