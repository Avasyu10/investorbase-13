
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let submissionId = null;

  try {
    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    submissionId = requestBody.submissionId;
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openaiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the auth user from the request headers
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          currentUserId = user.id;
          console.log('Found authenticated user:', currentUserId);
        }
      } catch (authErr) {
        console.log('Could not get authenticated user:', authErr);
      }
    }

    // Fetch the submission data first
    console.log('Fetching submission data...');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      form_slug: submission.form_slug
    });

    // Get the form details to find the owner (separate query to avoid JOIN issues)
    let formOwnerId = null;
    if (submission.form_slug) {
      const { data: formData, error: formError } = await supabase
        .from('public_submission_forms')
        .select('user_id')
        .eq('form_slug', submission.form_slug)
        .single();

      if (formError) {
        console.error('Failed to fetch form data:', formError);
        // Continue without form owner - we'll use current user or create without user
      } else if (formData) {
        formOwnerId = formData.user_id;
        console.log('Form owner ID:', formOwnerId);
      }
    }

    // Use the form owner as the user for the company, fallback to current user
    const effectiveUserId = formOwnerId || currentUserId;
    console.log('Using user ID for company creation:', effectiveUserId);

    // Update status to processing
    console.log('Updating submission status to processing...');
    const { error: statusUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing'
      })
      .eq('id', submissionId);

    if (statusUpdateError) {
      console.error('Failed to update status to processing:', statusUpdateError);
    }

    // Prepare the enhanced analysis prompt that balances form answers with market data
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application by EQUALLY prioritizing both the applicant's answers to form questions AND relevant market data/industry insights. Both aspects should carry significant weight in your evaluation.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}
    - Submitter Email: ${submission.submitter_email || 'Not provided'}

    Application Responses:

    1. Problem and Timing: "${submission.question_1 || 'Not provided'}"
       Evaluation Criteria: Clarity of problem definition, market timing assessment, solution relevance

    2. Customer Discovery: "${submission.question_2 || 'Not provided'}"
       Evaluation Criteria: Market size and potential, customer acquisition strategy, go-to-market approach

    3. Competitive Advantage: "${submission.question_3 || 'Not provided'}"
       Evaluation Criteria: Uniqueness of solution, defensibility of moat, competitive positioning

    4. Team Background: "${submission.question_4 || 'Not provided'}"
       Evaluation Criteria: Relevant experience and expertise, team composition, domain knowledge

    5. Incubation Goals: "${submission.question_5 || 'Not provided'}"
       Evaluation Criteria: Clarity of milestones, realistic timeline, resource requirements

    ANALYSIS INSTRUCTIONS:

    For the OVERALL ASSESSMENT:
    - Generate EXACTLY 6-7 assessment points that deeply integrate both answer quality AND market data
    - Each point should combine specific insights from their responses with concrete market metrics, industry benchmarks, and data points
    - Include market size data, growth rates, customer acquisition costs, competitive landscape metrics, and timing indicators
    - Balance evaluation between what they understand (based on answers) and market validation of their approach

    For STRENGTHS AND WEAKNESSES in each section:
    - Provide exactly 4-5 STRENGTHS and 4-5 WEAKNESSES for each section
    - SIGNIFICANTLY ENHANCE weaknesses with more market data, competitive threats, industry challenges, and specific metrics
    - Include market barriers, competitive dynamics, industry failure rates, cost benchmarks, and regulatory challenges in weaknesses
    - Balance evaluation between answer quality AND extensive market data/numbers for both strengths and weaknesses
    - Connect their responses to concrete market evidence and data points in both positive and negative aspects

    Each strength and weakness should integrate:
    1. Assessment of their actual response quality/depth
    2. Relevant market data, statistics, or industry benchmarks
    3. How market realities support or challenge their position
    4. Specific numbers, percentages, dollar amounts, and comparative metrics

    Please provide a detailed analysis in the following JSON format. IMPORTANT: All scores must be on a scale of 1-100 (not 1-5 or 1-10):

    {
      "overall_score": number (1-100),
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from the application)",
        "stage": "string (based on their responses - Idea, Prototype, Early Revenue, Growth)",
        "introduction": "string (2-3 sentence description based on their executive summary and responses)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their answer quality AND market data to evaluate problem definition and timing",
          "strengths": ["exactly 4-5 strengths that balance answer assessment with market validation and specific data points", "another strength combining their response quality with industry metrics", "third strength with market size/growth data", "fourth strength with competitive landscape data", "fifth strength with timing and market trends data"],
          "improvements": ["exactly 4-5 improvements heavily incorporating market data, competitive threats, and industry challenges with specific metrics", "another improvement combining response weaknesses with market realities, barrier data, and competitive costs", "third improvement with competitive threats, market saturation data, and industry failure rates", "fourth improvement with market timing risks, regulatory challenges, and adoption curve data", "fifth improvement with industry benchmark gaps, cost barriers, and market penetration challenges"]
        },
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their customer discovery response AND market size/potential data",
          "strengths": ["exactly 4-5 strengths balancing their market understanding with actual market data and metrics", "another strength with customer acquisition insights and industry benchmarks", "third strength with go-to-market approach and market penetration data", "fourth strength with addressable market size validation", "fifth strength with market growth trends and opportunity sizing"],
          "improvements": ["exactly 4-5 improvements heavily incorporating market analysis, competitive dynamics, and customer acquisition cost challenges", "another improvement with customer acquisition barriers, market penetration costs, and industry CAC benchmarks", "third improvement with market saturation risks, competitive spending data, and customer retention challenges", "fourth improvement with market timing barriers, adoption cycle data, and go-to-market cost analysis", "fifth improvement with competitive market dynamics, customer acquisition difficulty metrics, and market entry barriers"]
        },
        "competitive_advantage": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their competitive claims AND competitive landscape data",
          "strengths": ["exactly 4-5 strengths balancing their differentiation claims with competitive analysis data", "another strength with moat assessment and industry defensibility metrics", "third strength with competitive positioning and market share data", "fourth strength with innovation metrics and patent landscape", "fifth strength with sustainable advantage validation through market data"],
          "improvements": ["exactly 4-5 improvements heavily incorporating competitive threats, market dynamics, and differentiation challenges", "another improvement with competitive landscape risks, market consolidation data, and threat analysis", "third improvement with differentiation erosion risks, competitive spending data, and moat sustainability challenges", "fourth improvement with competitive response threats, market positioning costs, and defensibility gaps", "fifth improvement with innovation cycle data, competitive advantage decay rates, and market disruption risks"]
        },
        "team_strength": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their team description AND industry team success patterns/data",
          "strengths": ["exactly 4-5 strengths balancing their team experience with industry success metrics", "another strength with domain expertise and industry leadership benchmarks", "third strength with team composition and startup success rate data", "fourth strength with relevant background and industry network validation", "fifth strength with execution capability and track record assessment"],
          "improvements": ["exactly 4-5 improvements heavily incorporating team gaps, industry requirements, and execution risk data", "another improvement with skill gaps, hiring challenges, and industry competency costs", "third improvement with experience deficits, team scaling risks, and leadership gap analysis", "fourth improvement with team composition risks, hiring market data, and retention challenges", "fifth improvement with execution risk factors, team building costs, and advisory needs with market benchmarks"]
        },
        "execution_plan": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their execution planning AND industry execution benchmarks/data",
          "strengths": ["exactly 4-5 strengths balancing their planning clarity with execution feasibility data", "another strength with milestone realism and industry timeline benchmarks", "third strength with resource planning and startup capital efficiency metrics", "fourth strength with goal specificity and success probability analysis", "fifth strength with implementation strategy and industry best practices alignment"],
          "improvements": ["exactly 4-5 improvements heavily incorporating execution challenges, industry failure data, and resource requirement analysis", "another improvement with timeline risks, startup failure rates, and milestone achievement difficulties", "third improvement with resource estimation gaps, burn rate dangers, and capital requirement challenges", "fourth improvement with execution barrier analysis, implementation cost data, and timeline risk factors", "fifth improvement with market entry challenges, scaling difficulties, and execution success rate benchmarks"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback that integrates their form responses with extensive market context, data points, and industry insights",
        "key_factors": ["factor balancing their strongest answers with market validation and specific data", "factor balancing their weakest responses with market challenges and metrics", "factor about overall application quality with industry positioning and benchmarks"],
        "next_steps": ["specific recommendation based on gaps in responses and market data", "another step with market-informed guidance and industry benchmarks", "third step with concrete actions supported by industry insights"],
        "assessment_points": ["Assessment point 1 integrating their problem definition quality with specific market data showing the ${submission.company_name || 'company'}'s target market is worth $X billion and growing at Y% annually, combined with evaluation of their problem articulation depth", "Assessment point 2 analyzing their customer discovery approach alongside industry data showing similar companies achieve $A customer acquisition costs and B% market penetration rates, with assessment of their go-to-market understanding", "Assessment point 3 evaluating their competitive positioning quality against market analysis indicating C% of companies in this space have similar advantages and D% market concentration, plus their competitive awareness depth", "Assessment point 4 assessing their team background demonstration with industry benchmarks showing E% success rate for similar team compositions and F average time to key milestones, combined with team capability evaluation", "Assessment point 5 examining their execution planning clarity with market timing analysis indicating G% probability of success given current industry trends and H average capital requirements, plus milestone realism assessment", "Assessment point 6 analyzing their overall market understanding against industry growth patterns showing I% annual market expansion and J competitive intensity metrics, combined with strategic thinking evaluation", "Assessment point 7 evaluating their innovation potential with market disruption data indicating K% of successful startups in this sector achieve L market penetration within M years, plus solution uniqueness assessment"]
      }
    }

    Remember: Give EQUAL importance to both the applicant's actual answers AND relevant market data/industry insights. Generate EXACTLY 6-7 assessment points. Each strength and weakness must integrate both aspects with specific data points and metrics. Significantly enhance weaknesses with more market data and competitive analysis. All scores must be on a 1-100 scale.
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API for enhanced analysis...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup evaluator for IIT Bombay. Give EQUAL weight to both the quality of applicant responses AND relevant market data/industry insights. Generate EXACTLY 6-7 assessment points that deeply integrate answer evaluation with market metrics. Provide exactly 4-5 strengths and 4-5 weaknesses for each section, with weaknesses heavily enhanced with market data, competitive threats, and industry challenges. Include specific data points, growth rates, market sizes, competitive dynamics, and industry benchmarks in every strength and weakness. Provide thorough analysis in valid JSON format only. All scores must be on a scale of 1-100. Do not wrap your response in markdown code blocks - return only the raw JSON object.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received, parsing...');

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      throw new Error('Invalid response structure from OpenAI');
    }

    let analysisText = openaiData.choices[0].message.content;
    console.log('Raw analysis text received from OpenAI');

    // Clean up the response if it's wrapped in markdown code blocks
    if (analysisText.startsWith('```json')) {
      console.log('Removing markdown code block formatting...');
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      console.log('Removing generic code block formatting...');
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed analysis result');
      console.log('Analysis overall score:', analysisResult.overall_score);
      console.log('Analysis recommendation:', analysisResult.recommendation);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned response:', analysisText);
      throw new Error('Analysis response was not valid JSON');
    }

    // Ensure the overall score is within the 1-100 range
    if (analysisResult.overall_score > 100) {
      console.log('Normalizing score from', analysisResult.overall_score, 'to 100-point scale');
      analysisResult.overall_score = Math.min(analysisResult.overall_score, 100);
    }

    // Create company and sections for ALL analysis results (not just Accept)
    let companyId = null;
    if (effectiveUserId) {
      console.log('Creating company and sections for analyzed submission...');
      
      // Extract company info from analysis
      const companyInfo = analysisResult.company_info || {};
      
      // Create company with proper user_id and company information
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: submission.company_name,
          overall_score: Number(analysisResult.overall_score) || 0,
          user_id: effectiveUserId,
          source: 'barc_form',
          assessment_points: analysisResult.summary?.assessment_points || []
        })
        .select()
        .single();

      if (companyError || !company) {
        console.error('Failed to create company:', companyError);
        throw new Error(`Failed to create company: ${companyError?.message || 'Unknown error'}`);
      }

      companyId = company.id;
      console.log('Successfully created company with ID:', companyId, 'for user:', effectiveUserId);

      // Create company details with additional info
      if (companyInfo.industry || companyInfo.stage || companyInfo.introduction) {
        const { error: detailsError } = await supabase
          .from('company_details')
          .insert({
            company_id: companyId,
            industry: companyInfo.industry || null,
            stage: companyInfo.stage || null,
            introduction: companyInfo.introduction || null,
            status: 'New'
          });

        if (detailsError) {
          console.error('Failed to create company details:', detailsError);
        } else {
          console.log('Created company details');
        }
      }

      // Create sections based on analysis
      const sectionsToCreate = [
        {
          company_id: companyId,
          title: 'Problem-Solution Fit',
          type: 'problem_solution_fit',
          score: Number(analysisResult.sections?.problem_solution_fit?.score) || 0,
          description: analysisResult.sections?.problem_solution_fit?.analysis || ''
        },
        {
          company_id: companyId,
          title: 'Market Opportunity',
          type: 'market_opportunity', 
          score: Number(analysisResult.sections?.market_opportunity?.score) || 0,
          description: analysisResult.sections?.market_opportunity?.analysis || ''
        },
        {
          company_id: companyId,
          title: 'Competitive Advantage',
          type: 'competitive_advantage',
          score: Number(analysisResult.sections?.competitive_advantage?.score) || 0,
          description: analysisResult.sections?.competitive_advantage?.analysis || ''
        },
        {
          company_id: companyId,
          title: 'Team Strength',
          type: 'team_strength',
          score: Number(analysisResult.sections?.team_strength?.score) || 0,
          description: analysisResult.sections?.team_strength?.analysis || ''
        },
        {
          company_id: companyId,
          title: 'Execution Plan',
          type: 'execution_plan',
          score: Number(analysisResult.sections?.execution_plan?.score) || 0,
          description: analysisResult.sections?.execution_plan?.analysis || ''
        }
      ];

      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Failed to create sections:', sectionsError);
      } else {
        console.log('Created sections:', sections?.length || 0);

        // Create section details for strengths and improvements
        for (const section of sections || []) {
          const sectionType = section.type;
          const sectionData = analysisResult.sections?.[sectionType];
          
          if (sectionData) {
            const detailsToCreate = [];
            
            // Add strengths
            if (sectionData.strengths && Array.isArray(sectionData.strengths)) {
              for (const strength of sectionData.strengths) {
                detailsToCreate.push({
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength
                });
              }
            }
            
            // Add improvements
            if (sectionData.improvements && Array.isArray(sectionData.improvements)) {
              for (const improvement of sectionData.improvements) {
                detailsToCreate.push({
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: improvement
                });
              }
            }

            if (detailsToCreate.length > 0) {
              const { error: detailsError } = await supabase
                .from('section_details')
                .insert(detailsToCreate);

              if (detailsError) {
                console.error(`Failed to create details for section ${section.type}:`, detailsError);
              }
            }
          }
        }
      }
    } else {
      console.log('Not creating company because no user ID available');
    }

    // Update the submission with analysis results and company_id
    console.log('Updating submission with analysis results...');
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        company_id: companyId
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Failed to update submission:', updateError);
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log(`Successfully analyzed BARC submission ${submissionId}${companyId ? ` and created company ${companyId}` : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult,
        companyId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-barc-form function:', error);

    // Try to update the submission with error status if we have a submissionId
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase
            .from('barc_form_submissions')
            .update({
              analysis_status: 'failed',
              analysis_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', submissionId);
          
          console.log('Updated submission status to failed');
        }
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        submissionId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
