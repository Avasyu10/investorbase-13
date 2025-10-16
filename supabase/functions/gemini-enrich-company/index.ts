import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { companyId, userId } = await req.json();

    if (!companyId) {
      throw new Error('companyId is required');
    }

    console.log(`Enriching company data for: ${companyId}`);

    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    console.log(`Company found: ${company.name}`);

    // Fetch submission data if available
    const { data: submission } = await supabase
      .from('startup_submissions')
      .select('*')
      .eq('startup_name', company.name)
      .single();

    // Fetch evaluation data if available
    const { data: evaluation } = await supabase
      .from('submission_evaluations')
      .select('*')
      .eq('startup_name', company.name)
      .single();

    console.log(`Submission found: ${submission?.id || 'None'}`);
    console.log(`Evaluation found: ${evaluation?.id || 'None'}`);

    // Build comprehensive prompt for Gemini
    const prompt = `Analyze the following startup and provide a comprehensive investment analysis:

Company Name: ${company.name}
Industry: ${company.industry || 'Not specified'}
Overall Score: ${company.overall_score || 'Not available'}

${submission ? `
Submission Details:
- Problem Statement: ${submission.problem_statement}
- Solution: ${submission.solution}
- Market Understanding: ${submission.market_understanding}
- Customer Understanding: ${submission.customer_understanding}
- Competitive Understanding: ${submission.competitive_understanding}
- Technical Understanding: ${submission.technical_understanding}
- Unique Selling Proposition: ${submission.unique_selling_proposition}
- Vision: ${submission.vision}
` : ''}

${evaluation ? `
AI Evaluation:
- Analysis Summary: ${evaluation.ai_analysis_summary || 'Not available'}
- Recommendations: ${evaluation.ai_recommendations || 'Not available'}
` : ''}

Assessment Points: ${company.assessment_points ? company.assessment_points.join(', ') : 'None'}

Please provide:
1. Market Analysis (150-200 words): Detailed analysis of the market opportunity, size, growth potential, and trends
2. Competitive Landscape (150-200 words): Analysis of competitors, differentiation strategy, and market positioning
3. Growth Potential (150-200 words): Assessment of scalability, expansion opportunities, and revenue potential
4. Risk Factors (150-200 words): Key risks including market, technical, financial, and execution risks
5. Investment Thesis (150-200 words): Overall investment recommendation and key value drivers

Format each section clearly with the section title followed by the analysis.`;

    console.log('Calling Gemini API...');

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error: ${errorText}`);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response received');

    // Parse the response into sections
    const sections: any = {
      market_analysis: '',
      competitive_landscape: '',
      growth_potential: '',
      risk_factors: '',
      investment_thesis: ''
    };

    // Extract sections from the generated text
    const sectionPatterns = [
      { key: 'market_analysis', pattern: /Market Analysis[:\s]*([\s\S]*?)(?=Competitive Landscape|$)/i },
      { key: 'competitive_landscape', pattern: /Competitive Landscape[:\s]*([\s\S]*?)(?=Growth Potential|$)/i },
      { key: 'growth_potential', pattern: /Growth Potential[:\s]*([\s\S]*?)(?=Risk Factors|$)/i },
      { key: 'risk_factors', pattern: /Risk Factors[:\s]*([\s\S]*?)(?=Investment Thesis|$)/i },
      { key: 'investment_thesis', pattern: /Investment Thesis[:\s]*([\s\S]*?)$/i }
    ];

    sectionPatterns.forEach(({ key, pattern }) => {
      const match = generatedText.match(pattern);
      if (match && match[1]) {
        sections[key] = match[1].trim();
      }
    });

    // Store in company_enrichment table
    const { error: upsertError } = await supabase
      .from('company_enrichment')
      .upsert({
        company_id: companyId,
        user_id: userId || company.user_id,
        enrichment_data: {
          full_analysis: generatedText,
          generated_at: new Date().toISOString()
        },
        market_analysis: sections.market_analysis,
        competitive_landscape: sections.competitive_landscape,
        growth_potential: sections.growth_potential,
        risk_factors: sections.risk_factors,
        investment_thesis: sections.investment_thesis,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'company_id'
      });

    if (upsertError) {
      console.error('Error storing enrichment:', upsertError);
      throw new Error(`Failed to store enrichment: ${upsertError.message}`);
    }

    console.log('Company enriched successfully');

    return new Response(
      JSON.stringify({
        success: true,
        enrichment: sections,
        full_text: generatedText
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in gemini-enrich-company:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
