
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "./cors.ts";

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
    
    console.log(`Processing public submission report: ${reportId}`);
    
    // Get public form submission data
    const { data: publicSubmission, error: submissionError } = await supabase
      .from('public_form_submissions')
      .select('pdf_url')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (submissionError) {
      console.error('Error fetching public submission:', submissionError);
      throw submissionError;
    }
    
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
    
    if (publicSubmission && publicSubmission.pdf_url) {
      // For public submissions, the PDF is stored in the public-uploads folder
      pdfPath = `public-uploads/${publicSubmission.pdf_url}`;
      console.log(`Using public submission PDF: ${pdfPath}`);
    } else if (report.pdf_url) {
      // Fallback to report's PDF URL
      pdfPath = report.pdf_url;
      console.log(`Using report PDF: ${pdfPath}`);
    } else {
      throw new Error('No PDF found for this submission');
    }
    
    // Download the PDF from storage
    let fileData;
    try {
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(pdfPath);
        
      if (error) {
        throw error;
      }
      
      fileData = data;
      console.log('Successfully downloaded PDF from storage');
    } catch (downloadError) {
      console.error('Error downloading PDF from primary path:', downloadError);
      
      // Try alternative path
      const filename = pdfPath.split('/').pop() || '';
      
      try {
        const { data, error } = await supabase.storage
          .from('report_pdfs')
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
    console.error('Error in analyze-public-pdf function:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  }
});
