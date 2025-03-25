
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getReportData } from "./reportService.ts";
import { corsHeaders } from "./cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { reportId } = await req.json();
    
    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "Report ID is required" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      );
    }

    console.log(`Starting analysis for report: ${reportId}`);
    
    // Get the report data including PDF as base64
    const { supabase, report, pdfBase64 } = await getReportData(reportId);
    
    // Check if this is from an email submission by checking report metadata
    const isEmailSubmission = report.email_submissions || 
                            (report.source === 'email') ||
                            (report.pdf_url && report.pdf_url.includes('email_attachments'));
    
    console.log(`Report source check: isEmailSubmission=${isEmailSubmission}, source=${report.source}, pdf_url=${report.pdf_url}`);
    
    // For email submissions, ensure we're using the email_submissions table
    if (isEmailSubmission && !report.email_submissions) {
      console.log('This appears to be an email submission without proper linking. Checking email_submissions table...');
      
      // Look for matching email submissions by file path
      const { data: emailSubmissionData, error: emailLookupError } = await supabase
        .from('email_submissions')
        .select('*')
        .filter('attachment_url', 'ilike', `%${report.pdf_url.split('/').pop()}%`)
        .maybeSingle();
        
      if (emailLookupError) {
        console.error('Error looking up email submission:', emailLookupError);
      } else if (emailSubmissionData) {
        console.log('Found matching email submission:', emailSubmissionData.id);
        
        // Update the report record to link to this email submission
        const { error: updateError } = await supabase
          .from('reports')
          .update({
            source: 'email',
            submitter_email: emailSubmissionData.from_email
          })
          .eq('id', reportId);
          
        if (updateError) {
          console.error('Error updating report with email source:', updateError);
        } else {
          console.log('Updated report with email source information');
        }
        
        // Update the email submission to link to this report
        if (!emailSubmissionData.report_id) {
          const { error: emailUpdateError } = await supabase
            .from('email_submissions')
            .update({ report_id: reportId })
            .eq('id', emailSubmissionData.id);
            
          if (emailUpdateError) {
            console.error('Error linking email submission to report:', emailUpdateError);
          } else {
            console.log(`Linked email submission ${emailSubmissionData.id} to report ${reportId}`);
          }
        }
      }
    }
    
    // Call the regular analyze-pdf function with the reportId
    const analyzeEndpoint = isEmailSubmission 
      ? 'analyze-pdf' 
      : 'analyze-pdf';
      
    console.log(`Calling ${analyzeEndpoint} edge function with reportId: ${reportId}`);
    
    // Forward to the appropriate analysis function
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/${analyzeEndpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
          // Add additional headers to avoid CORS issues
          'Origin': req.headers.get('Origin') || '*',
          'X-Client-Info': req.headers.get('X-Client-Info') || ''
        },
        body: JSON.stringify({ reportId })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from ${analyzeEndpoint}:`, errorText);
      
      return new Response(
        JSON.stringify({ error: `Error from analysis service: ${errorText}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status
        }
      );
    }
    
    const analysisResult = await response.json();
    console.log('Analysis complete, returning result');
    
    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error analyzing report:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
