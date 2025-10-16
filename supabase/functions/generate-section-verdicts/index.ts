import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SectionScore {
  name: string;
  score: number;
  maxScore: number;
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

    // Get company and evaluation data
    const { data: company } = await supabaseClient
      .from('companies')
      .select('name, response_received')
      .eq('id', companyId)
      .single();

    if (!company || !company.response_received) {
      throw new Error('Company data not found');
    }

    const responseData = JSON.parse(company.response_received);
    const evaluation = responseData.evaluation;
    const submission = responseData.submission;

    if (!evaluation) {
      throw new Error('No evaluation found');
    }

    // Map evaluation scores to section data
    const sections: SectionScore[] = [
      {
        name: 'Problem & Solution',
        score: Math.round(
          ((evaluation.existence_score || 0) +
            (evaluation.severity_score || 0) +
            (evaluation.frequency_score || 0) +
            (evaluation.direct_fit_score || 0) +
            (evaluation.differentiation_score || 0) +
            (evaluation.feasibility_score || 0) +
            (evaluation.effectiveness_score || 0)) / 7
        ),
        maxScore: 5,
      },
      {
        name: 'Target Customers',
        score: Math.round(
          ((evaluation.first_customers_score || 0) +
            (evaluation.accessibility_score || 0) +
            (evaluation.acquisition_approach_score || 0) +
            (evaluation.pain_recognition_score || 0)) / 4
        ),
        maxScore: 5,
      },
      {
        name: 'Competitors',
        score: Math.round(
          ((evaluation.direct_competitors_score || 0) +
            (evaluation.substitutes_score || 0) +
            (evaluation.differentiation_vs_players_score || 0) +
            (evaluation.dynamics_score || 0)) / 4
        ),
        maxScore: 5,
      },
      {
        name: 'Revenue Model',
        score: Math.round(
          ((evaluation.market_size_score || 0) +
            (evaluation.growth_trajectory_score || 0) +
            (evaluation.timing_readiness_score || 0) +
            (evaluation.external_catalysts_score || 0)) / 4
        ),
        maxScore: 5,
      },
      {
        name: 'USP',
        score: Math.round(
          ((evaluation.usp_clarity_score || 0) +
            (evaluation.usp_differentiation_strength_score || 0) +
            (evaluation.usp_defensibility_score || 0) +
            (evaluation.usp_alignment_score || 0)) / 4
        ),
        maxScore: 5,
      },
      {
        name: 'Prototype',
        score: Math.round(
          ((evaluation.tech_feasibility_score || 0) +
            (evaluation.tech_components_score || 0) +
            (evaluation.tech_complexity_awareness_score || 0) +
            (evaluation.tech_roadmap_score || 0)) / 4
        ),
        maxScore: 5,
      },
    ];

    // Generate Gemini verdicts for each section
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const verdicts: Record<string, string> = {};

    for (const section of sections) {
      const prompt = `You are an expert venture capital analyst. Analyze the following startup section and provide a critical verdict explaining why the score was given.

Company: ${company.name}
Section: ${section.name}
Score: ${section.score}/${section.maxScore}

Submission Data:
${JSON.stringify(submission, null, 2)}

Evaluation Scores:
${JSON.stringify(evaluation, null, 2)}

Provide a single paragraph (2-3 sentences) starting with "The score of ${section.score * 20} was given because..." that:
1. Explains the key strengths and weaknesses
2. Mentions specific details from the submission
3. Provides concrete, actionable insights
4. Uses a critical but constructive tone

Keep it concise, specific, and insightful.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        verdicts[section.name] = `The score of ${section.score * 20} was given based on the evaluation metrics, but a detailed analysis could not be generated at this time.`;
        continue;
      }

      const data = await response.json();
      const verdict = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        `The score of ${section.score * 20} was given based on the evaluation metrics.`;
      
      verdicts[section.name] = verdict.trim();
    }

    // Generate overall assessment
    const overallPrompt = `You are an expert venture capital analyst. Provide a comprehensive overall assessment for this startup.

Company: ${company.name}
Overall Score: ${evaluation.overall_average || 0}/20

Section Scores:
${sections.map(s => `- ${s.name}: ${s.score * 20}/100`).join('\n')}

Submission Data:
${JSON.stringify(submission, null, 2)}

AI Analysis Summary:
${evaluation.ai_analysis_summary || 'Not available'}

AI Recommendations:
${evaluation.ai_recommendations || 'Not available'}

Provide 3-5 concise bullet points that:
1. Highlight key strengths with specific details
2. Identify critical weaknesses and gaps
3. Assess market opportunity and timing
4. Evaluate competitive positioning
5. Provide investment recommendation

Format each point as a complete sentence with specific insights.`;

    const overallResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: overallPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    let overallAssessment = evaluation.ai_analysis_summary || 'Assessment generating...';
    if (overallResponse.ok) {
      const data = await overallResponse.json();
      overallAssessment = data.candidates?.[0]?.content?.parts?.[0]?.text || overallAssessment;
    }

    // Store in company_enrichment table
    const { error: enrichError } = await supabaseClient
      .from('company_enrichment')
      .upsert({
        company_id: companyId,
        user_id: responseData.user_id || company.user_id,
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
