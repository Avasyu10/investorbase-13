import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function evaluateSubmission(supabase: any, submissionId: string, lovableApiKey: string | undefined) {
  console.log('Starting evaluation for submission:', submissionId);

  // Update status to analyzing
  await supabase
    .from('iitguwahati_form_submissions')
    .update({ analysis_status: 'analyzing' })
    .eq('id', submissionId);

  // Fetch the submission
  const { data: submission, error: fetchError } = await supabase
    .from('iitguwahati_form_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    console.error('Error fetching submission:', fetchError);
    await supabase
      .from('iitguwahati_form_submissions')
      .update({ analysis_status: 'error', analysis_error: 'Submission not found' })
      .eq('id', submissionId);
    return { error: 'Submission not found' };
  }

  // Prepare the evaluation prompt
  const evaluationPrompt = `
You are a venture capital analyst evaluating a startup pitch deck submission. Evaluate the following startup submission based on 7 criteria. For each criterion, provide a score from 0-100 and detailed feedback.

## Startup Information:
- **Name**: ${submission.startup_name}
- **Founder**: ${submission.founder_name || 'Not provided'}
- **Domain & Problem**: ${submission.domain_and_problem || 'Not provided'}
- **Target Market Size**: ${submission.target_market_size || 'Not provided'}
- **Unique Proposition**: ${submission.unique_proposition || 'Not provided'}
- **Product Type & Stage**: ${submission.product_type_and_stage || 'Not provided'}
- **Primary Revenue Model**: ${submission.primary_revenue_model || 'Not provided'}
- **LTV/CAC Ratio**: ${submission.ltv_cac_ratio || 'Not provided'}
- **Total Funding Sought**: ${submission.total_funding_sought || 'Not provided'}
- **Key Traction Metric**: ${submission.key_traction_metric || 'Not provided'}
- **IP/Moat Status**: ${submission.ip_moat_status || 'Not provided'}
- **12-Month Roadmap**: ${submission.twelve_month_roadmap || 'Not provided'}

## Evaluation Criteria:

### 1. The Problem (Domain & Market Pain Point) - Score 0-100
Evaluate: Domain clarity, core problem definition, target audience identification, market size opportunity (TAM/SAM/SOM)

### 2. The Solution (The Innovation) - Score 0-100
Evaluate: Unique proposition clarity, key differentiators, innovative leap vs alternatives

### 3. The Product (Tangible/Intangible Offering) - Score 0-100
Evaluate: Product/service description clarity, key features, technology stack, development stage

### 4. Business Model (Path to Revenue Generation) - Score 0-100
Evaluate: Revenue streams clarity, pricing strategy, sales channels, CAC/LTV metrics

### 5. Finances (Commercial Viability & Traction) - Score 0-100
Evaluate: Financial metrics, traction evidence, use of funds clarity

### 6. Patents & Legalities (Competitive Moat & Funding Status) - Score 0-100
Evaluate: IP protection, regulatory compliance, funding history

### 7. Future Goals (Vision & Roadmap) - Score 0-100
Evaluate: Vision statement, roadmap clarity, milestone definition

Respond ONLY with a valid JSON object in this exact format (no additional text):
{
  "problem_score": <number 0-100>,
  "problem_feedback": "<2-3 bullet points>",
  "solution_score": <number 0-100>,
  "solution_feedback": "<2-3 bullet points>",
  "product_score": <number 0-100>,
  "product_feedback": "<2-3 bullet points>",
  "business_model_score": <number 0-100>,
  "business_model_feedback": "<2-3 bullet points>",
  "finances_score": <number 0-100>,
  "finances_feedback": "<2-3 bullet points>",
  "patents_legalities_score": <number 0-100>,
  "patents_legalities_feedback": "<2-3 bullet points>",
  "future_goals_score": <number 0-100>,
  "future_goals_feedback": "<2-3 bullet points>",
  "overall_summary": "<Executive summary of the startup in 2-3 sentences>"
}`;

  let evaluation;

  try {
    if (lovableApiKey) {
      // Use Lovable AI Gateway
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert VC analyst. Return only valid JSON.' },
            { role: 'user', content: evaluationPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Gateway error:', response.status, errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in AI response');
      }
      
      evaluation = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Calculate overall score (average of all sections)
    const scores = [
      evaluation.problem_score,
      evaluation.solution_score,
      evaluation.product_score,
      evaluation.business_model_score,
      evaluation.finances_score,
      evaluation.patents_legalities_score,
      evaluation.future_goals_score,
    ];
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Delete existing evaluation if any
    await supabase
      .from('iitguwahati_evaluations')
      .delete()
      .eq('submission_id', submissionId);

    // Save evaluation to iitguwahati_evaluations table
    const { error: saveError } = await supabase
      .from('iitguwahati_evaluations')
      .insert({
        submission_id: submissionId,
        startup_name: submission.startup_name,
        problem_score: evaluation.problem_score,
        problem_feedback: evaluation.problem_feedback,
        solution_score: evaluation.solution_score,
        solution_feedback: evaluation.solution_feedback,
        product_score: evaluation.product_score,
        product_feedback: evaluation.product_feedback,
        business_model_score: evaluation.business_model_score,
        business_model_feedback: evaluation.business_model_feedback,
        finances_score: evaluation.finances_score,
        finances_feedback: evaluation.finances_feedback,
        patents_legalities_score: evaluation.patents_legalities_score,
        patents_legalities_feedback: evaluation.patents_legalities_feedback,
        future_goals_score: evaluation.future_goals_score,
        future_goals_feedback: evaluation.future_goals_feedback,
        overall_score: overallScore,
        overall_summary: evaluation.overall_summary,
      });

    if (saveError) {
      console.error('Error saving evaluation:', saveError);
      throw saveError;
    }

    // Also update the submission with analysis_result
    const analysisResult = {
      overall_score: overallScore,
      problem_score: evaluation.problem_score,
      solution_score: evaluation.solution_score,
      product_score: evaluation.product_score,
      business_model_score: evaluation.business_model_score,
      finances_score: evaluation.finances_score,
      patents_legalities_score: evaluation.patents_legalities_score,
      future_goals_score: evaluation.future_goals_score,
      overall_summary: evaluation.overall_summary,
    };

    await supabase
      .from('iitguwahati_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    console.log('Evaluation completed for:', submission.startup_name, 'Overall Score:', overallScore);
    return { success: true, overallScore };

  } catch (error) {
    console.error('Evaluation error:', error);
    await supabase
      .from('iitguwahati_form_submissions')
      .update({ analysis_status: 'error', analysis_error: error.message })
      .eq('id', submissionId);
    return { error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { submissionId, evaluateAll } = body;

    if (evaluateAll) {
      // Fetch all submissions without completed analysis
      const { data: submissions, error } = await supabase
        .from('iitguwahati_form_submissions')
        .select('id')
        .or('analysis_status.is.null,analysis_status.neq.completed');

      if (error) {
        console.error('Error fetching submissions:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch submissions' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Found ${submissions?.length || 0} submissions to evaluate`);

      // Process submissions sequentially to avoid rate limits
      const results = [];
      for (const sub of submissions || []) {
        const result = await evaluateSubmission(supabase, sub.id, lovableApiKey);
        results.push({ id: sub.id, ...result });
        // Small delay between evaluations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(JSON.stringify({ success: true, evaluated: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'submissionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await evaluateSubmission(supabase, submissionId, lovableApiKey);

    return new Response(JSON.stringify(result), {
      status: result.error ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Function failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
