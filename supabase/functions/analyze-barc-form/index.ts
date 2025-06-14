
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Check environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAIKey: !!OPENAI_API_KEY
    });
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const { submissionId } = requestBody;
    
    if (!submissionId) {
      throw new Error('Missing submissionId in request body');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Fetching submission for analysis...');
    
    // Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      console.error('Error fetching submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }

    if (!submission) {
      throw new Error('Submission not found');
    }

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      form_slug: submission.form_slug,
      analysis_status: submission.analysis_status,
      user_id: submission.user_id
    });

    // Check if submission can be analyzed
    if (submission.analysis_status === 'processing') {
      console.log('Submission is currently being processed');
      throw new Error('Submission is currently being analyzed');
    }

    if (submission.analysis_status === 'completed') {
      console.log('Submission has already been completed');
      throw new Error('Submission has already been analyzed');
    }

    console.log('Attempting to acquire lock for submission analysis...');
    
    // Try to update status to processing - this acts as a lock
    const { data: lockResult, error: lockError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing',
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', submission.analysis_status) // Only update if status hasn't changed
      .select()
      .single();

    if (lockError || !lockResult) {
      console.log('Could not acquire lock - submission status may have changed');
      throw new Error('Submission is already being analyzed or has been completed');
    }

    console.log('Lock acquired successfully, starting analysis...');

    try {
      // Prepare the submission data for analysis
      const analysisData = {
        company_name: submission.company_name,
        executive_summary: submission.executive_summary,
        company_type: submission.company_type,
        company_registration_type: submission.company_registration_type,
        question_1: submission.question_1,
        question_2: submission.question_2,
        question_3: submission.question_3,
        question_4: submission.question_4,
        question_5: submission.question_5,
        company_linkedin_url: submission.company_linkedin_url,
        founder_linkedin_urls: submission.founder_linkedin_urls
      };

      console.log('Calling OpenAI for analysis...');
      
      // Call OpenAI to analyze the submission
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert venture capital analyst. Analyze the following startup application and provide a comprehensive assessment. Return your response as a JSON object with the following structure:
              {
                "overall_score": 85,
                "recommendation": "Accept|Consider|Reject",
                "strengths": ["strength1", "strength2"],
                "weaknesses": ["weakness1", "weakness2"],
                "market_potential": "High|Medium|Low",
                "team_assessment": "Strong|Moderate|Weak",
                "business_model_viability": "High|Medium|Low",
                "financial_projections": "Realistic|Optimistic|Concerning",
                "detailed_analysis": "Comprehensive analysis text here...",
                "key_risks": ["risk1", "risk2"],
                "next_steps": ["step1", "step2"]
              }
              
              Score the startup from 0-100 based on:
              - Team strength (25%)
              - Market opportunity (25%) 
              - Business model (20%)
              - Traction/progress (15%)
              - Financial projections (15%)
              
              Recommendation guidelines:
              - Accept: Score 80+, strong team, large market, proven traction
              - Consider: Score 60-79, good potential but needs more evaluation
              - Reject: Score <60, significant concerns or weak fundamentals`
            },
            {
              role: 'user',
              content: `Please analyze this startup application:
              
              Company: ${analysisData.company_name}
              Type: ${analysisData.company_type}
              Registration: ${analysisData.company_registration_type}
              
              Executive Summary: ${analysisData.executive_summary}
              
              Problem Statement: ${analysisData.question_1 || 'Not provided'}
              Solution: ${analysisData.question_2 || 'Not provided'}
              Market Analysis: ${analysisData.question_3 || 'Not provided'}
              Business Model: ${analysisData.question_4 || 'Not provided'}
              Financial Projections: ${analysisData.question_5 || 'Not provided'}
              
              Company LinkedIn: ${analysisData.company_linkedin_url || 'Not provided'}
              Founder LinkedIn URLs: ${analysisData.founder_linkedin_urls?.join(', ') || 'Not provided'}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
      }

      const openAIData = await openAIResponse.json();
      console.log('OpenAI analysis completed successfully');
      
      let analysisResult;
      try {
        // Try to parse the JSON response from OpenAI
        const content = openAIData.choices[0].message.content;
        analysisResult = JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing OpenAI response as JSON:', parseError);
        // Fallback: create a basic analysis structure
        analysisResult = {
          overall_score: 60,
          recommendation: "Consider",
          strengths: ["Application submitted"],
          weaknesses: ["Analysis parsing failed"],
          detailed_analysis: openAIData.choices[0].message.content || "Analysis completed but format parsing failed",
          market_potential: "Medium",
          team_assessment: "Moderate",
          business_model_viability: "Medium"
        };
      }

      console.log('Saving analysis results to database...');
      
      // Update the submission with analysis results
      const { error: updateError } = await supabase
        .from('barc_form_submissions')
        .update({
          analysis_status: 'completed',
          analysis_result: analysisResult,
          analyzed_at: new Date().toISOString(),
          analysis_error: null
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating submission with analysis:', updateError);
        throw new Error(`Failed to save analysis: ${updateError.message}`);
      }

      console.log('Analysis completed and saved successfully');

      return new Response(JSON.stringify({
        success: true,
        analysis: analysisResult,
        message: 'Analysis completed successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (analysisError) {
      console.error('Error during analysis:', analysisError);
      
      // Update submission with error status
      await supabase
        .from('barc_form_submissions')
        .update({
          analysis_status: 'failed',
          analysis_error: analysisError instanceof Error ? analysisError.message : 'Unknown error during analysis',
          analyzed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      throw analysisError;
    }

  } catch (error) {
    console.error('Error in analyze-barc-form function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
