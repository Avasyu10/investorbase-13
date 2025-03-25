
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request data
    const { reportId } = await req.json();
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    
    console.log(`Processing email submission report: ${reportId}`);
    
    // First check if it's an email or email pitch submission
    const { data: emailSubmission } = await supabase
      .from('email_submissions')
      .select('attachment_url, from_email')
      .eq('report_id', reportId)
      .maybeSingle();
      
    const { data: emailPitchSubmission } = await supabase
      .from('email_pitch_submissions')
      .select('attachment_url, sender_email')
      .eq('report_id', reportId)
      .maybeSingle();
      
    // Get report data
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      throw new Error(`Report not found: ${reportError.message}`);
    }
    
    // Determine PDF path
    let pdfPath = '';
    
    if (emailSubmission && emailSubmission.attachment_url) {
      pdfPath = emailSubmission.attachment_url;
      console.log(`Using email submission attachment: ${pdfPath}`);
    } else if (emailPitchSubmission && emailPitchSubmission.attachment_url) {
      pdfPath = emailPitchSubmission.attachment_url;
      console.log(`Using email pitch submission attachment: ${pdfPath}`);
    } else {
      throw new Error('No attachment found for this email submission');
    }
    
    // Download the PDF from storage
    let fileData;
    try {
      const { data, error } = await supabase.storage
        .from('email_attachments')
        .download(pdfPath);
        
      if (error) {
        throw error;
      }
      
      fileData = data;
      console.log('Successfully downloaded PDF from email_attachments bucket');
    } catch (downloadError) {
      console.error('Error downloading PDF from primary path:', downloadError);
      
      // Try to download using just the filename (without folders)
      const filename = pdfPath.split('/').pop() || '';
      
      try {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .download(filename);
          
        if (error) {
          throw error;
        }
        
        fileData = data;
        console.log('Successfully downloaded PDF using filename only');
      } catch (alternateError) {
        throw new Error(`Failed to download PDF: ${alternateError}`);
      }
    }
    
    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(
      Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    console.log('Successfully converted PDF to base64');
    
    // Now forward the PDF to the main analyze-pdf function to process
    // We'll call the analyze-pdf edge function to avoid duplicating code
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportId,
        pdfBase64: base64 // Pass the PDF content directly
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
    }
    
    const analysisResult = await response.json();
    console.log('Analysis completed successfully');
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in analyze-email-pitch-pdf function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  }
});
