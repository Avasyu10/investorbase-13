import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SectionScore {
  name: string;
  score: number;
  maxScore: number;
  detailedScores: { [key: string]: number };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Generating section verdicts for company:', companyId);

    // Get company data with user_id
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('name, user_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found: ' + (companyError?.message || 'Unknown error'));
    }

    // Get startup submission
    const { data: submission, error: submissionError } = await supabaseClient
      .from('startup_submissions')
      .select('*')
      .eq('startup_name', company.name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
    }

    // Get submission evaluation with all detailed scores
    const { data: evaluation, error: evaluationError } = await supabaseClient
      .from('submission_evaluations')
      .select('*')
      .or(`startup_submission_id.eq.${submission?.id},startup_name.eq.${company.name}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evaluationError || !evaluation) {
      throw new Error('Evaluation not found: ' + (evaluationError?.message || 'No evaluation data'));
    }

    // Calculate section scores (all scores are out of 20, average them)
    const sections: SectionScore[] = [
      {
        name: 'Problem Statement',
        score: Math.round(
          ((evaluation.existence_score || 0) +
            (evaluation.severity_score || 0) +
            (evaluation.frequency_score || 0) +
            (evaluation.unmet_need_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Existence Score': evaluation.existence_score || 0,
          'Severity Score': evaluation.severity_score || 0,
          'Frequency Score': evaluation.frequency_score || 0,
          'Unmet Need Score': evaluation.unmet_need_score || 0,
        },
      },
      {
        name: 'Solution',
        score: Math.round(
          ((evaluation.direct_fit_score || 0) +
            (evaluation.differentiation_score || 0) +
            (evaluation.feasibility_score || 0) +
            (evaluation.effectiveness_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Direct Fit Score': evaluation.direct_fit_score || 0,
          'Differentiation Score': evaluation.differentiation_score || 0,
          'Feasibility Score': evaluation.feasibility_score || 0,
          'Effectiveness Score': evaluation.effectiveness_score || 0,
        },
      },
      {
        name: 'Market Understanding',
        score: Math.round(
          ((evaluation.market_size_score || 0) +
            (evaluation.growth_trajectory_score || 0) +
            (evaluation.timing_readiness_score || 0) +
            (evaluation.external_catalysts_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Market Size Score': evaluation.market_size_score || 0,
          'Growth Trajectory Score': evaluation.growth_trajectory_score || 0,
          'Timing Readiness Score': evaluation.timing_readiness_score || 0,
          'External Catalysts Score': evaluation.external_catalysts_score || 0,
        },
      },
      {
        name: 'Customer Understanding',
        score: Math.round(
          ((evaluation.first_customers_score || 0) +
            (evaluation.accessibility_score || 0) +
            (evaluation.acquisition_approach_score || 0) +
            (evaluation.pain_recognition_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'First Customers Score': evaluation.first_customers_score || 0,
          'Accessibility Score': evaluation.accessibility_score || 0,
          'Acquisition Approach Score': evaluation.acquisition_approach_score || 0,
          'Pain Recognition Score': evaluation.pain_recognition_score || 0,
        },
      },
      {
        name: 'Competitor Understanding',
        score: Math.round(
          ((evaluation.direct_competitors_score || 0) +
            (evaluation.substitutes_score || 0) +
            (evaluation.differentiation_vs_players_score || 0) +
            (evaluation.dynamics_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Direct Competitors Score': evaluation.direct_competitors_score || 0,
          'Substitutes Score': evaluation.substitutes_score || 0,
          'Differentiation vs Players Score': evaluation.differentiation_vs_players_score || 0,
          'Dynamics Score': evaluation.dynamics_score || 0,
        },
      },
      {
        name: 'USP',
        score: Math.round(
          ((evaluation.usp_clarity_score || 0) +
            (evaluation.usp_differentiation_strength_score || 0) +
            (evaluation.usp_defensibility_score || 0) +
            (evaluation.usp_alignment_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'USP Clarity Score': evaluation.usp_clarity_score || 0,
          'USP Differentiation Strength Score': evaluation.usp_differentiation_strength_score || 0,
          'USP Defensibility Score': evaluation.usp_defensibility_score || 0,
          'USP Alignment Score': evaluation.usp_alignment_score || 0,
        },
      },
      {
        name: 'Vision',
        score: Math.round(
          ((evaluation.tech_vision_ambition_score || 0) +
            (evaluation.tech_coherence_score || 0) +
            (evaluation.tech_alignment_score || 0) +
            (evaluation.tech_realism_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Vision Ambition Score': evaluation.tech_vision_ambition_score || 0,
          'Tech Coherence Score': evaluation.tech_coherence_score || 0,
          'Tech Alignment Score': evaluation.tech_alignment_score || 0,
          'Tech Realism Score': evaluation.tech_realism_score || 0,
        },
      },
      {
        name: 'Technology Understanding',
        score: Math.round(
          ((evaluation.tech_feasibility_score || 0) +
            (evaluation.tech_components_score || 0) +
            (evaluation.tech_complexity_awareness_score || 0) +
            (evaluation.tech_roadmap_score || 0)) / 4
        ),
        maxScore: 20,
        detailedScores: {
          'Tech Feasibility Score': evaluation.tech_feasibility_score || 0,
          'Tech Components Score': evaluation.tech_components_score || 0,
          'Tech Complexity Awareness Score': evaluation.tech_complexity_awareness_score || 0,
          'Tech Roadmap Score': evaluation.tech_roadmap_score || 0,
        },
      },
    ];

    // Generate Gemini verdicts for each section
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const verdicts: Record<string, string> = {};

    for (const section of sections) {
      // Get the submission data for the section
      const sectionData = {
        'Problem Statement': submission?.problem_statement,
        'Solution': submission?.solution,
        'Market Understanding': submission?.market_understanding,
        'Customer Understanding': submission?.customer_understanding,
        'Competitor Understanding': submission?.competitive_understanding,
        'USP': submission?.unique_selling_proposition,
        'Vision': submission?.vision,
        'Technology Understanding': submission?.technical_understanding,
      }[section.name] || '';

      const detailedScoresText = Object.entries(section.detailedScores)
        .map(([key, value]) => `${key}: ${value}/20`)
        .join('\n');

      const prompt = `You are an expert venture capital analyst. Analyze this startup section and provide a comprehensive verdict.

Company: ${company.name}
Section: ${section.name}
Overall Score: ${section.score}/20 (${Math.round((section.score / 20) * 100)}%)

Detailed Scores:
${detailedScoresText}

Submission Content:
${sectionData}

Provide a 2-3 sentence analysis starting with "The score of ${section.score}/20 (${Math.round((section.score / 20) * 100)}%) was given because..." that:
1. Explains the key strengths and critical weaknesses
2. References specific details from the submission
3. Provides actionable insights
4. Uses a balanced, constructive tone

Keep it concise and insightful.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', await response.text());
        verdicts[section.name] = `The score of ${section.score}/20 was given based on the evaluation metrics, but a detailed analysis could not be generated at this time.`;
        continue;
      }

      const data = await response.json();
      const verdict = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        `The score of ${section.score}/20 was given based on the evaluation metrics.`;
      
      verdicts[section.name] = verdict.trim();
    }

    // Generate overall assessment
    const overallPrompt = `You are an expert venture capital analyst. Provide a comprehensive overall assessment for this startup.

Company: ${company.name}
Overall Score: ${evaluation.overall_average || 0}/20

Section Scores:
${sections.map(s => `- ${s.name}: ${s.score}/20 (${Math.round((s.score / 20) * 100)}%)`).join('\n')}

Problem Statement:
${submission?.problem_statement || 'Not provided'}

Solution:
${submission?.solution || 'Not provided'}

AI Analysis Summary:
${evaluation.ai_analysis_summary || 'Not available'}

AI Recommendations:
${evaluation.ai_recommendations || 'Not available'}

Provide 4-6 concise bullet points that:
1. Highlight key strengths with specific details
2. Identify critical weaknesses and gaps
3. Assess market opportunity and timing
4. Evaluate competitive positioning
5. Comment on team capability and vision
6. Provide investment recommendation with rationale

Format as bullet points starting with "- " for each point.`;

    const overallResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: overallPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    let overallAssessment = evaluation.ai_analysis_summary || 'Assessment generating...';
    if (overallResponse.ok) {
      const data = await overallResponse.json();
      overallAssessment = data.candidates?.[0]?.content?.parts?.[0]?.text || overallAssessment;
    } else {
      console.error('Error generating overall assessment:', await overallResponse.text());
    }

    // Store in company_enrichment table with proper user_id
    const { error: enrichError } = await supabaseClient
      .from('company_enrichment')
      .upsert({
        company_id: companyId,
        user_id: company.user_id,
        enrichment_data: {
          section_verdicts: verdicts,
          section_scores: sections,
          overall_assessment: overallAssessment,
          generated_at: new Date().toISOString(),
        },
      }, {
        onConflict: 'company_id',
      });

    if (enrichError) {
      console.error('Error storing enrichment:', enrichError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        verdicts,
        sections,
        overall_assessment: overallAssessment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating section verdicts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
