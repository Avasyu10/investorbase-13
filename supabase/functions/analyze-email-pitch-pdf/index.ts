
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("========== ANALYZE-EMAIL-PITCH-PDF FUNCTION STARTED v3 ==========");
  let startTime = new Date().getTime();
  
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
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (jsonError) {
      console.error("Error parsing JSON request:", jsonError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body", 
        success: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    const { reportId } = requestData;
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    
    console.log(`Processing email/pitch submission report: ${reportId}`);
    console.log(`Time elapsed: ${new Date().getTime() - startTime}ms`);
    
    // First, check if this is from email submissions
    const { data: emailSubmission, error: emailError } = await supabase
      .from('email_submissions')
      .select('attachment_url')
      .eq('report_id', reportId)
      .maybeSingle();
      
    if (emailError) {
      console.error('Error fetching email submission:', emailError);
    }

    // If not from email submissions, check if it's from email pitch submissions
    let attachmentUrl = null;
    let isExternalUrl = false;
    let storageSource = 'email_attachments';
    
    if (emailSubmission && emailSubmission.attachment_url) {
      attachmentUrl = emailSubmission.attachment_url;
      // Check if this is an external URL (like mailparser.io)
      isExternalUrl = attachmentUrl.startsWith('http');
      console.log(`Found email submission with attachment: ${attachmentUrl} (isExternal: ${isExternalUrl})`);
    } else {
      // Check for email pitch submission
      const { data: pitchSubmission, error: pitchError } = await supabase
        .from('email_pitch_submissions')
        .select('attachment_url')
        .eq('report_id', reportId)
        .maybeSingle();
        
      if (pitchError) {
        console.error('Error fetching pitch submission:', pitchError);
      }
      
      if (pitchSubmission && pitchSubmission.attachment_url) {
        attachmentUrl = pitchSubmission.attachment_url;
        // Check if this is an external URL (like mailparser.io)
        isExternalUrl = attachmentUrl.startsWith('http');
        console.log(`Found email pitch submission with attachment: ${attachmentUrl} (isExternal: ${isExternalUrl})`);
      }
    }
    
    // Get report data as a fallback
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
      
    if (reportError) {
      throw new Error(`Report not found: ${reportError.message}`);
    }
    
    console.log(`Report data retrieved. Time elapsed: ${new Date().getTime() - startTime}ms`);
    
    // Download the PDF - either from storage or from external URL
    let fileData;
    
    if (attachmentUrl) {
      if (isExternalUrl) {
        // For external URLs (like mailparser.io links), download directly using fetch
        try {
          console.log(`Downloading from external URL: ${attachmentUrl}`);
          const response = await fetch(attachmentUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
          }
          
          fileData = await response.blob();
          console.log('Successfully downloaded PDF from external URL');
          
          // Optionally save the file to our own storage for future reference
          if (fileData) {
            try {
              const fileName = `external_${reportId}_${Date.now()}.pdf`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('report_pdfs')
                .upload(fileName, fileData);
                
              if (uploadError) {
                console.error('Error saving external file to storage:', uploadError);
              } else {
                console.log(`Saved external file to report_pdfs/${fileName}`);
                
                // Update the report with the new PDF URL
                await supabase
                  .from('reports')
                  .update({ pdf_url: fileName })
                  .eq('id', reportId);
              }
            } catch (saveError) {
              console.error('Error saving external file:', saveError);
              // Non-blocking error, continue with analysis
            }
          }
        } catch (fetchError) {
          console.error(`Error downloading from external URL:`, fetchError);
          // Fall back to report PDF if external download fails
        }
      } else {
        // For internal storage URLs, download from Supabase storage
        try {
          console.log(`Attempting to download from ${storageSource}/${attachmentUrl}`);
          const { data, error } = await supabase.storage
            .from(storageSource)
            .download(attachmentUrl);
            
          if (error) {
            console.error(`Error downloading from ${storageSource}:`, error);
          } else {
            fileData = data;
            console.log(`Successfully downloaded PDF from ${storageSource}`);
          }
        } catch (downloadError) {
          console.error(`Error downloading from ${storageSource}:`, downloadError);
        }
      }
    }
    
    // If we couldn't get the file from the attachment URL, fall back to the report PDF
    if (!fileData && report.pdf_url) {
      try {
        console.log(`Falling back to report PDF: ${report.pdf_url}`);
        const { data, error } = await supabase.storage
          .from('report_pdfs')
          .download(report.pdf_url);
          
        if (error) {
          throw error;
        }
        
        fileData = data;
        console.log('Successfully downloaded PDF from report_pdfs');
      } catch (reportDownloadError) {
        throw new Error(`Failed to download PDF: ${reportDownloadError}`);
      }
    }
    
    if (!fileData) {
      throw new Error('No PDF found for this submission');
    }
    
    console.log(`PDF downloaded. Time elapsed: ${new Date().getTime() - startTime}ms`);
    
    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = btoa(
      Array.from(bytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    console.log('Successfully converted PDF to base64');
    console.log(`Base64 length: ${base64.length} chars`);
    console.log(`Conversion complete. Time elapsed: ${new Date().getTime() - startTime}ms`);
    
    // Now forward the PDF to the main analyze-pdf function to process
    console.log(`Calling analyze-pdf function with report ID: ${reportId}`);
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
    
    console.log(`analyze-pdf function called. Time elapsed: ${new Date().getTime() - startTime}ms`);
    console.log(`analyze-pdf response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to analyze PDF: ${response.status} - ${errorText}`);
    }
    
    const analysisResult = await response.json();
    console.log('Analysis completed successfully');
    console.log(`Total time elapsed: ${new Date().getTime() - startTime}ms`);
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in analyze-email-pitch-pdf function:', error);
    console.log(`Total time elapsed on error: ${new Date().getTime() - startTime}ms`);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('not found') ? 404 : 500
    });
  } finally {
    console.log("========== ANALYZE-EMAIL-PITCH-PDF FUNCTION COMPLETED v3 ==========");
  }
});
