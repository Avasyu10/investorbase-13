import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SectionScore {
  name: string;
  score: number;
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

    console.log('Generating AI verdicts for company:', companyId);

    // Check if verdicts already exist
    const { data: existingVerdict } = await supabaseClient
      .from('section_verdicts')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingVerdict) {
      console.log('Verdicts already exist, returning cached data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          cached: true,
          data: existingVerdict 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      throw new Error('Failed to fetch submission data');
    }

    if (!submission) {
      throw new Error('No submission found for company');
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
        detailedScores: {
          'Tech Feasibility Score': evaluation.tech_feasibility_score || 0,
          'Tech Components Score': evaluation.tech_components_score || 0,
          'Tech Complexity Awareness Score': evaluation.tech_complexity_awareness_score || 0,
          'Tech Roadmap Score': evaluation.tech_roadmap_score || 0,
        },
      },
    ];

    // Generate all verdicts with a single Gemini API call using JSON output
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Generating all verdicts with single Gemini API call');

    // Build comprehensive prompt for all sections
    const sectionsData = sections.map(section => {
      const sectionContent = {
        'Problem Statement': submission?.problem_statement,
        'Solution': submission?.solution,
        'Market Understanding': submission?.market_understanding,
        'Customer Understanding': submission?.customer_understanding,
        'Competitor Understanding': submission?.competitive_understanding,
        'USP': submission?.unique_selling_proposition,
        'Vision': submission?.vision,
        'Technology Understanding': submission?.technical_understanding,
      }[section.name] || '';

      const detailedScores = Object.entries(section.detailedScores)
        .map(([key, value]) => `${key}: ${value}/20`)
        .join(', ');

      return {
        name: section.name,
        score: section.score,
        percentage: Math.round((section.score / 20) * 100),
        detailedScores,
        content: sectionContent,
      };
    });

    const comprehensivePrompt = `You are an expert venture capital analyst. Analyze this startup comprehensively and provide verdicts for all sections plus an overall assessment.

Company: ${company.name}
Overall Score: ${evaluation.overall_average || 0}/20

SECTIONS TO ANALYZE:

${sectionsData.map((s, idx) => `
${idx + 1}. ${s.name}
   Score: ${s.score}/20 (${s.percentage}%)
   Detailed Scores: ${s.detailedScores}
   Submission Content: ${s.content || 'Not provided'}
`).join('\n')}

PREVIOUS AI ANALYSIS:
${evaluation.ai_analysis_summary || 'Not available'}

PREVIOUS RECOMMENDATIONS:
${evaluation.ai_recommendations || 'Not available'}

Generate a JSON response with the following structure. For each section verdict, provide a 2-3 sentence analysis starting with "The score of [X]/20 ([Y]%) was given because..." that explains key strengths, weaknesses, and actionable insights. For the overall assessment, provide 4-6 bullet points covering strengths, weaknesses, market opportunity, competitive positioning, and investment recommendation.

{
  "verdicts": {
    "Problem Statement": "verdict text here",
    "Solution": "verdict text here",
    "Market Understanding": "verdict text here",
    "Customer Understanding": "verdict text here",
    "Competitor Understanding": "verdict text here",
    "USP": "verdict text here",
    "Vision": "verdict text here",
    "Technology Understanding": "verdict text here"
  },
  "overallAssessment": "Overall assessment with bullet points starting with - "
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

    let verdicts: Record<string, string> = {};
    let overallAssessment = '';

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: comprehensivePrompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API failed: ${errorText}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('No response from Gemini API');
      }

      console.log('Raw Gemini response:', responseText);

      // Parse JSON response
      let parsedResponse;
      try {
        // Remove markdown code blocks if present
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedResponse = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse Gemini JSON response');
      }

      verdicts = parsedResponse.verdicts || {};
      overallAssessment = parsedResponse.overallAssessment || evaluation.ai_analysis_summary || 'Assessment not available';

      console.log('Successfully parsed verdicts from Gemini');

    } catch (error) {
      console.error('Error generating verdicts with Gemini:', error);
      
      // Fallback verdicts
      sections.forEach(section => {
        verdicts[section.name] = `The score of ${section.score}/20 (${Math.round((section.score / 20) * 100)}%) was given based on the evaluation metrics.`;
      });
      overallAssessment = evaluation.ai_analysis_summary || 'Assessment could not be generated at this time.';
    }

    const sectionScores: Record<string, number> = {};
    sections.forEach(section => {
      sectionScores[section.name] = section.score;
    });

    // Calculate overall score
    const overallScore = sections.reduce((sum, s) => sum + s.score, 0) / sections.length;

    // Store in section_verdicts table
    const verdictData = {
      company_id: companyId,
      user_id: company.user_id,
      problem_statement_verdict: verdicts['Problem Statement'],
      problem_statement_score: sectionScores['Problem Statement'],
      solution_verdict: verdicts['Solution'],
      solution_score: sectionScores['Solution'],
      market_understanding_verdict: verdicts['Market Understanding'],
      market_understanding_score: sectionScores['Market Understanding'],
      customer_understanding_verdict: verdicts['Customer Understanding'],
      customer_understanding_score: sectionScores['Customer Understanding'],
      competitor_understanding_verdict: verdicts['Competitor Understanding'],
      competitor_understanding_score: sectionScores['Competitor Understanding'],
      usp_verdict: verdicts['USP'],
      usp_score: sectionScores['USP'],
      vision_verdict: verdicts['Vision'],
      vision_score: sectionScores['Vision'],
      technology_understanding_verdict: verdicts['Technology Understanding'],
      technology_understanding_score: sectionScores['Technology Understanding'],
      overall_assessment: overallAssessment,
      overall_score: overallScore,
      detailed_scores: sections.reduce((acc, s) => {
        acc[s.name] = s.detailedScores;
        return acc;
      }, {} as Record<string, any>),
    };

    const { data: insertedData, error: insertError } = await supabaseClient
      .from('section_verdicts')
      .insert(verdictData)
      .select()
      .single();

    if (insertError) {
      console.error('Error storing verdicts:', insertError);
      throw new Error('Failed to store verdicts: ' + insertError.message);
    }

    console.log('Successfully generated and stored AI verdicts');

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: insertedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating AI verdicts:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
