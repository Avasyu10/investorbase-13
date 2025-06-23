
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { corsHeaders } from "./cors.ts";
import { analyzeWithOpenAI } from "./openaiService.ts";
import { DatabaseService } from "./databaseService.ts";
import { ReportService } from "./reportService.ts";

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const requestBody = await req.json();
    const { reportId, fileBase64, fileName, overallScore, assessmentPoints, scoringScale, usePublicAnalysisPrompt = false } = requestBody;
    
    console.log('Received request:', { reportId, hasFileBase64: !!fileBase64, fileName, overallScore, assessmentPoints, scoringScale, usePublicAnalysisPrompt });

    if (!reportId) {
      throw new Error('Report ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const dbService = new DatabaseService(supabase);
    const reportService = new ReportService(supabase);

    // Get the report and user information
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:user_id (
          is_iitbombay
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      throw new Error(`Failed to fetch report: ${reportError.message}`);
    }

    console.log('Report data:', { id: report.id, pdf_url: report.pdf_url, user_id: report.user_id });

    const isIITBombayUser = report.profiles?.is_iitbombay || false;
    console.log('User is IIT Bombay user:', isIITBombayUser);

    // If fileBase64 is not provided, fetch it from storage
    let pdfBase64 = fileBase64;
    if (!pdfBase64) {
      console.log('No fileBase64 provided, fetching from storage...');
      
      if (!report.pdf_url) {
        throw new Error('No PDF URL found in report');
      }

      // Try multiple download strategies
      let pdfBlob: Blob | null = null;
      const downloadPaths = [
        `${report.user_id}/${report.pdf_url}`, // User-prefixed path
        report.pdf_url, // Direct path
        report.pdf_url.split('/').pop() || report.pdf_url // Just filename
      ];

      for (const path of downloadPaths) {
        try {
          console.log(`Attempting to download PDF from path: ${path}`);
          const { data, error } = await supabase.storage
            .from('report_pdfs')
            .download(path);

          if (!error && data) {
            pdfBlob = data;
            console.log(`Successfully downloaded PDF from path: ${path}`);
            break;
          } else {
            console.log(`Failed to download from path ${path}:`, error?.message);
          }
        } catch (err) {
          console.log(`Error downloading from path ${path}:`, err);
        }
      }

      if (!pdfBlob) {
        throw new Error('Could not download PDF file from storage');
      }

      // Convert blob to base64
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      pdfBase64 = btoa(String.fromCharCode(...uint8Array));
      console.log('Successfully converted PDF to base64, length:', pdfBase64.length);
    }

    if (!pdfBase64) {
      throw new Error('No PDF data available for analysis');
    }

    // Call the AI analysis
    console.log('Starting AI analysis...');
    const analysisResult = await analyzeWithOpenAI(pdfBase64, geminiApiKey, usePublicAnalysisPrompt, scoringScale, isIITBombayUser);
    console.log('AI analysis completed');

    // Handle different response formats based on user type
    if (!isIITBombayUser && !usePublicAnalysisPrompt) {
      // Handle non-IIT Bombay user format
      console.log('Processing non-IIT Bombay user analysis result');
      
      // Update the report with the new format
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          overall_score: analysisResult.overallScore,
          analysis_result: analysisResult,
          analysis_status: 'completed',
          analyzed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report:', updateError);
        throw new Error(`Failed to update report: ${updateError.message}`);
      }

      // For non-IIT Bombay users, we don't create traditional sections
      // The frontend will handle the new format differently
      console.log('Analysis completed for non-IIT Bombay user');

      return new Response(
        JSON.stringify({
          success: true,
          analysisResult,
          reportId,
          message: 'Analysis completed successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Handle IIT Bombay user format (existing logic)
      console.log('Received analysis result:', {
        overallScore: analysisResult.overallScore,
        sectionsCount: analysisResult.sections?.length || 0
      });

      const companyId = await dbService.createCompany(
        report.user_id,
        overallScore || analysisResult.overallScore,
        assessmentPoints || analysisResult.assessmentPoints || [],
        report.title,
        report.submitter_email
      );

      console.log('Created company with ID:', companyId);

      const sectionsCreated = await dbService.createSections(companyId, analysisResult.sections || []);
      console.log('Created sections:', sectionsCreated);

      await reportService.updateReportWithResults(reportId, analysisResult, companyId);

      console.log('Analysis completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          analysisResult,
          companyId,
          reportId,
          message: 'Analysis completed successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in analyze-pdf function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
