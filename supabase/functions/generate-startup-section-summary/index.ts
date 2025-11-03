import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { submissionId, sectionName } = await req.json();
    
    if (!submissionId || !sectionName) {
      throw new Error('Missing required parameters');
    }

    console.log(`Generating summary for submission ${submissionId}, section: ${sectionName}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch submission data
    const { data: submission, error: submissionError } = await supabase
      .from('startup_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      throw new Error(`Failed to fetch submission: ${submissionError?.message}`);
    }

    // Fetch evaluation data
    const { data: evaluation, error: evalError } = await supabase
      .from('submission_evaluations')
      .select('*')
      .or(`startup_submission_id.eq.${submissionId},startup_name.eq.${submission.startup_name}`)
      .limit(1)
      .single();

    if (evalError) {
      console.log('No evaluation found, using submission data only');
    }

    // Build context based on section
    let context = '';
    let score = 0;
    let feedback = '';

    switch (sectionName) {
      case 'Problem & Solution':
        context = `Problem Statement: ${submission.problem_statement || 'Not provided'}\nSolution: ${submission.solution || 'Not provided'}`;
        score = evaluation?.problem_clarity_score || 0;
        feedback = evaluation?.problem_clarity_feedback || '';
        break;
      case 'Target Customers':
        context = `Customer Understanding: ${(submission as any).customer_understanding || 'Not provided'}\nMarket Understanding: ${(submission as any).market_understanding || 'Not provided'}`;
        score = evaluation?.market_understanding_score || 0;
        feedback = evaluation?.market_understanding_feedback || '';
        break;
      case 'Competitors':
        context = `Competition: ${(submission as any).competition || 'Not provided'}\nMarket Understanding: ${(submission as any).market_understanding || 'Not provided'}`;
        score = Math.floor((evaluation?.market_understanding_score || 0) * 0.5);
        feedback = evaluation?.market_understanding_feedback || '';
        break;
      case 'Revenue Model':
        context = `Solution: ${submission.solution || 'Not provided'}\nRevenue Model Information: ${(submission as any).revenue_model || 'Not provided'}`;
        score = Math.floor((evaluation?.solution_quality_score || 0) * 0.5);
        feedback = evaluation?.solution_quality_feedback || '';
        break;
      case 'USP':
        context = `Solution: ${submission.solution || 'Not provided'}\nUnique Value Proposition: ${(submission as any).usp || 'Not provided'}`;
        score = Math.floor((evaluation?.solution_quality_score || 0) * 0.5);
        feedback = evaluation?.solution_quality_feedback || '';
        break;
      case 'Prototype':
        context = `Traction: ${(submission as any).traction || 'Not provided'}\nPrototype Status: ${(submission as any).prototype_status || 'Not provided'}`;
        score = evaluation?.traction_score || 0;
        feedback = evaluation?.traction_feedback || '';
        break;
      default:
        throw new Error(`Unknown section: ${sectionName}`);
    }

    // Use Lovable AI Gateway with Gemini
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are analyzing a startup submission for the section "${sectionName}".

Score: ${score}/20
Feedback: ${feedback}

Context:
${context}

Generate a concise, bulleted analysis (2-3 bullet points) explaining:
1. Why this score was given based on the submission data
2. Key strengths or weaknesses identified
3. Relevant industry context or benchmarks

Keep each bullet point under 2 sentences. Focus on being specific and actionable.`;

    console.log('Calling Lovable AI Gateway...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup evaluator. Provide concise, insightful analysis in bullet point format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0]?.message?.content || 'Summary generation failed';

    console.log('Successfully generated summary');

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        score 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-startup-section-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
