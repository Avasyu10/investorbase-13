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
            score: Math.round(existingSummary.score || 0),
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

    console.log('Section name received:', sectionName, 'Type:', typeof sectionName);
    console.log('Evaluation exists:', !!evaluation);

    switch (sectionName) {
      case 'Problem & Solution':
        context = `Problem: ${(submission as any).problem || (submission as any).problem_statement || 'Not provided'}
Solution: ${(submission as any).solution || 'Not provided'}
Target Market: ${(submission as any).target_market || (submission as any).target_audience || 'Not provided'}`;
        if (evaluation) {
          const ex = evaluation.existence_score || 0;
          const sev = evaluation.severity_score || 0;
          const freq = evaluation.frequency_score || 0;
          const unmet = evaluation.unmet_need_score || 0;
          score = Math.min(100, Math.round(Math.pow((ex + sev + freq + unmet) / 20, 1.5) * 100));
          feedback = `Existence: ${ex}/5, Severity: ${sev}/5, Frequency: ${freq}/5, Unmet Need: ${unmet}/5`;
        }
        break;
        
      case 'Target Customers':
        context = `Current Traction: ${(submission as any).traction || 'Not provided'}
Customer Validation: ${(submission as any).customer_validation || 'Not provided'}
Metrics: ${(submission as any).metrics || 'Not provided'}`;
        if (evaluation) {
          const fc = evaluation.first_customers_score || 0;
          const acc = evaluation.accessibility_score || 0;
          const acq = evaluation.acquisition_approach_score || 0;
          const pr = evaluation.pain_recognition_score || 0;
          score = Math.min(100, Math.round(Math.pow((fc + acc + acq + pr) / 20, 1.5) * 100));
          feedback = `First Customers: ${fc}/5, Accessibility: ${acc}/5, Acquisition: ${acq}/5, Pain Recognition: ${pr}/5`;
        }
        break;
        
      case 'Competitors':
        context = `Competitors: ${(submission as any).competitors || 'Not provided'}
Competitive Advantage: ${(submission as any).competitive_advantage || 'Not provided'}
Market Position: ${(submission as any).market_position || 'Not provided'}`;
        if (evaluation) {
          const dc = evaluation.direct_competitors_score || 0;
          const sub = evaluation.substitutes_score || 0;
          const dvp = evaluation.differentiation_vs_players_score || 0;
          const dyn = evaluation.dynamics_score || 0;
          score = Math.min(100, Math.round(Math.pow((dc + sub + dvp + dyn) / 20, 1.5) * 100));
          feedback = `Direct Competitors: ${dc}/5, Substitutes: ${sub}/5, Differentiation: ${dvp}/5, Dynamics: ${dyn}/5`;
        }
        break;
        
      case 'Revenue Model':
        context = `Business Model: ${(submission as any).business_model || 'Not provided'}
Revenue Model: ${(submission as any).revenue_model || 'Not provided'}
Unique Value Proposition: ${(submission as any).unique_value_proposition || 'Not provided'}`;
        if (evaluation) {
          const uc = evaluation.usp_clarity_score || 0;
          const uds = evaluation.usp_differentiation_strength_score || 0;
          const ud = evaluation.usp_defensibility_score || 0;
          const ua = evaluation.usp_alignment_score || 0;
          score = Math.min(100, Math.round(Math.pow((uc + uds + ud + ua) / 20, 1.5) * 100));
          feedback = `USP Clarity: ${uc}/5, Strength: ${uds}/5, Defensibility: ${ud}/5, Alignment: ${ua}/5`;
        }
        break;
        
      case 'USP':
        context = `Solution: ${(submission as any).solution || 'Not provided'}
Technology: ${(submission as any).technology || 'Not provided'}
Innovation: ${(submission as any).innovation || 'Not provided'}`;
        if (evaluation) {
          const dfit = evaluation.direct_fit_score || 0;
          const diff = evaluation.differentiation_score || 0;
          const feas = evaluation.feasibility_score || 0;
          const eff = evaluation.effectiveness_score || 0;
          score = Math.min(100, Math.round(Math.pow((dfit + diff + feas + eff) / 20, 1.5) * 100));
          feedback = `Direct Fit: ${dfit}/5, Differentiation: ${diff}/5, Feasibility: ${feas}/5, Effectiveness: ${eff}/5`;
        }
        break;
        
      case 'Prototype':
        context = `Team: ${(submission as any).team || (submission as any).team_members || 'Not provided'}
Team Experience: ${(submission as any).team_experience || 'Not provided'}
Founder Background: ${(submission as any).founder_background || 'Not provided'}`;
        if (evaluation) {
          const tva = evaluation.tech_vision_ambition_score || 0;
          const tc = evaluation.tech_coherence_score || 0;
          const ta = evaluation.tech_alignment_score || 0;
          const treal = evaluation.tech_realism_score || 0;
          const tfeas = evaluation.tech_feasibility_score || 0;
          const tcomp = evaluation.tech_components_score || 0;
          const tca = evaluation.tech_complexity_awareness_score || 0;
          const tr = evaluation.tech_roadmap_score || 0;
          score = Math.min(100, Math.round(Math.pow((tva + tc + ta + treal + tfeas + tcomp + tca + tr) / 40, 1.5) * 100));
          feedback = `Vision: ${tva}/5, Coherence: ${tc}/5, Alignment: ${ta}/5, Realism: ${treal}/5, Feasibility: ${tfeas}/5, Components: ${tcomp}/5, Complexity: ${tca}/5, Roadmap: ${tr}/5`;
        }
        break;
        
      default:
        console.error('Unknown section name:', sectionName, 'Available cases: Problem & Solution, Target Customers, Competitors, Revenue Model, USP, Prototype');
        throw new Error(`Unknown section: ${sectionName}`);
    }

    console.log('Switch completed. Score:', score, 'Context length:', context.length);

    // Use Lovable AI Gateway with Gemini
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are analyzing a startup submission for the section "${sectionName}".

Score: ${Math.round(score)}/100
Component Scores: ${feedback}

Context:
${context}

Generate a concise, bulleted analysis (3-4 bullet points) explaining:
1. Why this score was given based on the submission data and component scores
2. Key strengths identified in this area
3. Key weaknesses or areas for improvement
4. Relevant industry context, benchmarks, or actionable recommendations

Keep each bullet point under 2 sentences. Focus on being specific and actionable. Format as bullet points starting with "- ".`;

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
        score: Math.round(score),
        max_score: 100,
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
        score: Math.round(score),
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
