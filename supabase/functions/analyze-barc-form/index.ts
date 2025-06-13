
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { submissionId } = await req.json();
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission data
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Not found'}`);
    }

    // Check if already processed
    if (submission.analysis_status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Already analyzed',
          submissionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update to processing
    await supabase
      .from('barc_form_submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submissionId);

    // Simple analysis prompt
    const prompt = `Analyze this startup application and provide scores (1-100):

Company: ${submission.company_name || 'Not provided'}
Summary: ${submission.executive_summary || 'Not provided'}
Problem: ${submission.question_1 || 'Not provided'}
Customers: ${submission.question_2 || 'Not provided'}
Advantage: ${submission.question_3 || 'Not provided'}
Team: ${submission.question_4 || 'Not provided'}
Plan: ${submission.question_5 || 'Not provided'}

Respond with valid JSON only:
{
  "overall_score": 75,
  "recommendation": "Accept",
  "sections": {
    "problem_solution_fit": {"score": 80, "analysis": "Good problem definition"},
    "market_opportunity": {"score": 70, "analysis": "Strong market potential"},
    "competitive_advantage": {"score": 75, "analysis": "Clear differentiation"},
    "team_strength": {"score": 80, "analysis": "Experienced team"},
    "execution_plan": {"score": 70, "analysis": "Realistic timeline"}
  }
}`;

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a startup evaluator. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // Parse JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(content.replace(/```json\s*/, '').replace(/\s*```$/, ''));
    } catch (e) {
      throw new Error('Invalid JSON from OpenAI');
    }

    // Update with results
    await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
