
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('Function called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Processing POST request');
    
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    const { submissionId } = requestBody;
    
    if (!submissionId) {
      console.error('Missing submissionId');
      return new Response(
        JSON.stringify({ success: false, error: 'Submission ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing submission:', submissionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created');

    // Fetch submission data
    console.log('Fetching submission data');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Database fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Submission not found: ${fetchError?.message || 'Unknown error'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submission found:', submission.company_name);

    // Check if already processed
    if (submission.analysis_status === 'completed') {
      console.log('Already analyzed');
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
    console.log('Updating status to processing');
    await supabase
      .from('barc_form_submissions')
      .update({ analysis_status: 'processing' })
      .eq('id', submissionId);

    // Simple analysis using OpenAI
    const prompt = `Analyze this BARC application and provide a JSON response with scores and recommendation:

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

    console.log('Calling OpenAI API');
    
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
      console.error('OpenAI API error:', openaiResponse.status);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received');
    
    const content = openaiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // Parse JSON response
    let analysisResult;
    try {
      const cleanContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
      analysisResult = JSON.parse(cleanContent);
      console.log('Analysis result parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON from OpenAI');
    }

    // Update with results
    console.log('Updating submission with results');
    await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    console.log('Analysis completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analysis function:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
