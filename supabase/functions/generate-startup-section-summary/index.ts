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
    const { submissionId, sectionName, forceRefresh } = await req.json();
    
    if (!submissionId || !sectionName) {
      throw new Error('Missing required parameters');
    }

    console.log(`Processing summary request for submission ${submissionId}, section: ${sectionName}, forceRefresh: ${forceRefresh}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if summary already exists in database (unless force refresh)
    if (!forceRefresh) {
      const { data: existingSummary, error: fetchError } = await supabase
        .from('startup_section_summaries')
        .select('*')
        .eq('submission_id', submissionId)
        .eq('section_name', sectionName)
        .maybeSingle();

      if (!fetchError && existingSummary) {
        console.log('Found existing summary in database');
        return new Response(
          JSON.stringify({ 
            success: true, 
            summary: existingSummary.summary,
            score: existingSummary.score,
            fromCache: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      case 'Problem Clarity':
        context = `Problem Statement: ${submission.problem_statement || 'Not provided'}\nSolution: ${submission.solution || 'Not provided'}`;
        score = evaluation?.problem_clarity_score || 0;
        feedback = evaluation?.problem_clarity_feedback || '';
        break;
      case 'Market Understanding':
        context = `Target Audience: ${(submission as any).target_audience || 'Not provided'}\nMarket Size: ${(submission as any).market_size || 'Not provided'}\nCompetitors: ${(submission as any).competitors || 'Not provided'}`;
        score = evaluation?.market_understanding_score || 0;
        feedback = evaluation?.market_understanding_feedback || '';
        break;
      case 'Solution Quality':
        context = `Solution: ${submission.solution || 'Not provided'}\nUnique Value Proposition: ${(submission as any).unique_value_proposition || 'Not provided'}\nRevenue Model: ${(submission as any).revenue_model || 'Not provided'}`;
        score = evaluation?.solution_quality_score || 0;
        feedback = evaluation?.solution_quality_feedback || '';
        break;
      case 'Team Capability':
        context = `Team Members: ${(submission as any).team_members || 'Not provided'}\nTeam Experience: ${(submission as any).team_experience || 'Not provided'}\nFounder Background: ${(submission as any).founder_background || 'Not provided'}`;
        score = evaluation?.team_capability_score || 0;
        feedback = evaluation?.team_capability_feedback || '';
        break;
      case 'Traction':
        context = `Current Traction: ${(submission as any).traction || 'Not provided'}\nCustomer Validation: ${(submission as any).customer_validation || 'Not provided'}\nGrowth Metrics: ${(submission as any).growth_metrics || 'Not provided'}`;
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

    // Save summary to database
    const { error: insertError } = await supabase
      .from('startup_section_summaries')
      .upsert({
        submission_id: submissionId,
        section_name: sectionName,
        score,
        max_score: 20,
        summary,
        feedback,
        context_data: { context }
      }, {
        onConflict: 'submission_id,section_name'
      });

    if (insertError) {
      console.error('Error saving summary to database:', insertError);
      // Don't fail the request, just log the error
    } else {
      console.log('Summary saved to database successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        score,
        fromCache: false
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
