
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing'
      })
      .eq('id', submissionId);

    // Fetch the submission data
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error(`Failed to fetch submission: ${fetchError?.message}`);
    }

    // Prepare the analysis prompt
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name}
    - Registration Type: ${submission.company_registration_type}
    - Company Type: ${submission.company_type}
    - Executive Summary: ${submission.executive_summary}

    Application Responses:
    1. Problem and Timing: ${submission.question_1 || 'Not provided'}
    2. Target Customers: ${submission.question_2 || 'Not provided'}
    3. Competitive Advantage: ${submission.question_3 || 'Not provided'}
    4. Team Background: ${submission.question_4 || 'Not provided'}
    5. Milestones and Support Needed: ${submission.question_5 || 'Not provided'}

    Please provide a detailed analysis covering:

    1. **Problem-Solution Fit** (Score: 1-10)
       - Clarity of problem definition
       - Market timing assessment
       - Solution relevance

    2. **Market Opportunity** (Score: 1-10)
       - Market size and potential
       - Customer acquisition strategy
       - Go-to-market approach

    3. **Competitive Advantage** (Score: 1-10)
       - Uniqueness of solution
       - Defensibility of moat
       - Competitive positioning

    4. **Team Strength** (Score: 1-10)
       - Relevant experience and expertise
       - Team composition
       - Domain knowledge

    5. **Execution Plan** (Score: 1-10)
       - Clarity of milestones
       - Realistic timeline
       - Resource requirements

    6. **Overall Assessment** (Score: 1-10)
       - Investment potential
       - Program fit
       - Risk assessment

    For each section, provide:
    - Numerical score (1-10)
    - Detailed analysis (2-3 paragraphs)
    - Key strengths
    - Areas for improvement
    - Specific recommendations

    Finally, provide:
    - Overall recommendation (Accept/Consider/Reject)
    - Summary of key decision factors
    - Suggested next steps

    Format your response as valid JSON with the following structure:
    {
      "overall_score": number,
      "recommendation": "Accept" | "Consider" | "Reject",
      "sections": {
        "problem_solution_fit": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "market_opportunity": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "competitive_advantage": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "team_strength": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "execution_plan": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "overall_assessment": {
          "score": number,
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        }
      },
      "summary": {
        "key_factors": ["string"],
        "next_steps": ["string"],
        "overall_feedback": "string"
      }
    }
    `;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, constructive analysis in valid JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const analysisText = openaiData.choices[0].message.content;

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Analysis response was not valid JSON');
    }

    // Update the submission with analysis results
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log(`Successfully analyzed BARC submission ${submissionId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-barc-submission function:', error);

    // Try to update the submission with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { submissionId } = await req.json().catch(() => ({}));
      
      if (submissionId) {
        await supabase
          .from('barc_form_submissions')
          .update({
            analysis_status: 'error',
            analysis_error: error.message
          })
          .eq('id', submissionId);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
