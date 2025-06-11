
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  console.log(`Request headers:`, Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
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

  let submissionId = null;

  try {
    console.log('Reading request body...');
    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    submissionId = requestBody.submissionId;
    
    console.log('Received analysis request for BARC submission:', submissionId);
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openaiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the submission data
    console.log('Fetching submission data...');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email
    });

    // Update status to processing
    console.log('Updating submission status to processing...');
    const { error: statusUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing'
      })
      .eq('id', submissionId);

    if (statusUpdateError) {
      console.error('Failed to update status to processing:', statusUpdateError);
    }

    // Prepare the comprehensive analysis prompt
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application using the specific metrics provided for each question.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and Analysis Framework:

    1. QUESTION 1: "What specific problem are you solving, and why is now the right time to solve it?"
    RESPONSE: ${submission.question_1 || 'Not provided'}
    
    METRICS TO EVALUATE:
    - Clarity of Problem Definition (Is it a real, urgent pain point?) - Score 1-10
    - Market Timing Justification (Evidence of market shift, tech readiness, policy, etc.) - Score 1-10
    - Insight Depth (Customer anecdotes, data, or firsthand experience) - Score 1-10

    2. QUESTION 2: "Who are your first 10 customers or users, and how did you find or plan to find them?"
    RESPONSE: ${submission.question_2 || 'Not provided'}
    
    METRICS TO EVALUATE:
    - Customer Clarity (Can they describe the personas or segments well?) - Score 1-10
    - Validation Effort (Have they spoken to customers or secured pilots?) - Score 1-10
    - GTMP Realism (Is the acquisition strategy practical and scalable?) - Score 1-10

    3. QUESTION 3: "What is your unfair advantage or moat that will help you win over time?"
    RESPONSE: ${submission.question_3 || 'Not provided'}
    
    METRICS TO EVALUATE:
    - Differentiation (Clearly stated vs existing solutions?) - Score 1-10
    - Defensibility (Is it hard to replicate—tech IP, data, partnerships?) - Score 1-10
    - Strategic Awareness (Are they aware of and positioned against incumbents?) - Score 1-10

    4. QUESTION 4: "How does your team's background uniquely equip you to solve this problem?"
    RESPONSE: ${submission.question_4 || 'Not provided'}
    
    METRICS TO EVALUATE:
    - Founder-Problem Fit (Domain or lived experience?) - Score 1-10
    - Complementarity of Skills (Tech + business + ops?) - Score 1-10
    - Execution History (Track record of building, selling, or scaling?) - Score 1-10

    5. QUESTION 5: "What milestones do you aim to achieve during the incubation period, and what support do you need from us to get there?"
    RESPONSE: ${submission.question_5 || 'Not provided'}
    
    METRICS TO EVALUATE:
    - Goal Specificity (Clear KPIs: MVP, first customer, funding?) - Score 1-10
    - Feasibility (Are goals realistic in 3–6 months?) - Score 1-10
    - Support Clarity (Do they know what they need from your incubator—mentorship, infra, access?) - Score 1-10

    Please provide a comprehensive analysis in valid JSON format with the following structure:
    {
      "overall_score": number (1-10),
      "recommendation": "Accept" | "Consider" | "Reject",
      "question_analyses": {
        "question_1": {
          "clarity_of_problem_definition": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "market_timing_justification": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "insight_depth": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "question_score": number,
          "overall_analysis": "string"
        },
        "question_2": {
          "customer_clarity": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "validation_effort": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "gtmp_realism": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "question_score": number,
          "overall_analysis": "string"
        },
        "question_3": {
          "differentiation": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "defensibility": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "strategic_awareness": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "question_score": number,
          "overall_analysis": "string"
        },
        "question_4": {
          "founder_problem_fit": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "complementarity_of_skills": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "execution_history": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "question_score": number,
          "overall_analysis": "string"
        },
        "question_5": {
          "goal_specificity": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "feasibility": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "support_clarity": {
            "score": number,
            "analysis": "string",
            "evidence": "string"
          },
          "question_score": number,
          "overall_analysis": "string"
        }
      },
      "summary": {
        "key_strengths": ["string"],
        "key_weaknesses": ["string"],
        "recommendation_rationale": "string",
        "next_steps": ["string"]
      }
    }

    Ensure each metric is scored objectively based on the evidence in the responses, and provide detailed analysis explaining the scoring rationale.
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API for analysis...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, metric-based analysis in valid JSON format only. Do not wrap your response in markdown code blocks or any other formatting - return only the raw JSON object.'
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
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received, parsing...');

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      throw new Error('Invalid response structure from OpenAI');
    }

    let analysisText = openaiData.choices[0].message.content;
    console.log('Raw analysis text:', analysisText);

    // Clean up the response if it's wrapped in markdown code blocks
    if (analysisText.startsWith('```json')) {
      console.log('Removing markdown code block formatting...');
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      console.log('Removing generic code block formatting...');
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned response:', analysisText);
      throw new Error('Analysis response was not valid JSON');
    }

    // Update the submission with analysis results
    console.log('Updating submission with analysis results...');
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Failed to update submission:', updateError);
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
    console.error('Error in analyze-barc-form function:', error);

    // Try to update the submission with error status if we have a submissionId
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase
            .from('barc_form_submissions')
            .update({
              analysis_status: 'failed',
              analysis_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', submissionId);
          
          console.log('Updated submission status to failed');
        }
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        submissionId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
