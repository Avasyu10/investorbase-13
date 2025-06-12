
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

    For the OVERALL ASSESSMENT - CRITICAL REQUIREMENT FOR ASSESSMENT POINTS:
    - Generate EXACTLY 6-7 assessment points that MUST include SPECIFIC NUMBERS in every single point
    - Every assessment point MUST contain at least 3-4 of these quantitative elements: market size in dollars (e.g., "$2.5 billion market"), growth rates with percentages (e.g., "15% CAGR"), customer metrics with numbers (e.g., "$500 average customer acquisition cost"), competitive data with figures (e.g., "competitors spending $50M annually"), industry benchmarks with percentages (e.g., "industry average 30% gross margins")
    - MANDATORY: Each point must seamlessly integrate their response quality assessment with extensive market numbers including: TAM/SAM figures, growth percentages, cost metrics, competitive spending, success rates, timeline data, pricing benchmarks, market penetration rates
    - Example format: "The company demonstrates strong market understanding in a rapidly expanding $X billion sector growing at X% annually, though their customer acquisition strategy requires validation against industry benchmarks showing average CAC of $X and X-month payback periods typical for successful companies in this space."
    - Focus heavily on: market size data, growth rate percentages, cost analysis, competitive landscape numbers, customer metrics, financial benchmarks, timing indicators with specific data points

    For STRENGTHS AND WEAKNESSES in each section:
    - Provide exactly 4-5 STRENGTHS and 4-5 WEAKNESSES for each section
    - WEAKNESSES should focus on identifying actual flaws, gaps, risks, and limitations in their approach/responses combined with market challenges - NOT recommendations for improvement
    - Weaknesses should highlight: response quality deficiencies, market barriers they face, competitive threats they're exposed to, industry challenges affecting them, cost disadvantages, timing risks, execution gaps, market positioning problems
    - Balance evaluation between answer quality AND extensive market data/numbers for both strengths and weaknesses
    - Connect their responses to concrete market evidence and data points in both positive and negative aspects
    - For weaknesses, focus on what IS wrong or missing, not what SHOULD BE done

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
          "improvements": ["exactly 4-5 weaknesses identifying actual flaws and gaps in their problem understanding combined with market barriers, expressed as deficiencies rather than recommendations", "another weakness highlighting response limitations with market reality challenges and competitive threats", "third weakness about problem validation gaps with market saturation data and industry failure rates", "fourth weakness regarding market timing risks with regulatory challenges and adoption curve barriers", "fifth weakness about execution gaps with industry benchmark deficiencies and market penetration challenges"]
        },
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their customer discovery response AND market size/potential data",
          "strengths": ["exactly 4-5 strengths balancing their market understanding with actual market data and metrics", "another strength with customer acquisition insights and industry benchmarks", "third strength with go-to-market approach and market penetration data", "fourth strength with addressable market size validation", "fifth strength with market growth trends and opportunity sizing"],
          "improvements": ["exactly 4-5 weaknesses identifying actual market analysis flaws and customer understanding gaps combined with acquisition cost challenges", "another weakness highlighting market penetration barriers with customer acquisition cost disadvantages and retention risks", "third weakness about market size validation gaps with saturation risks and competitive spending disadvantages", "fourth weakness regarding customer discovery deficiencies with adoption cycle barriers and go-to-market cost challenges", "fifth weakness about competitive market positioning gaps with customer acquisition difficulty and market entry obstacles"]
        },
        "competitive_advantage": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their competitive claims AND competitive landscape data",
          "strengths": ["exactly 4-5 strengths balancing their differentiation claims with competitive analysis data", "another strength with moat assessment and industry defensibility metrics", "third strength with competitive positioning and market share data", "fourth strength with innovation metrics and patent landscape", "fifth strength with sustainable advantage validation through market data"],
          "improvements": ["exactly 4-5 weaknesses identifying actual competitive disadvantages and differentiation gaps combined with market threats", "another weakness highlighting competitive landscape vulnerabilities with market consolidation risks and threat exposure", "third weakness about differentiation sustainability gaps with competitive response risks and moat erosion", "fourth weakness regarding competitive positioning deficiencies with market positioning costs and defensibility limitations", "fifth weakness about innovation cycle gaps with competitive advantage decay risks and market disruption vulnerabilities"]
        },
        "team_strength": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their team description AND industry team success patterns/data",
          "strengths": ["exactly 4-5 strengths balancing their team experience with industry success metrics", "another strength with domain expertise and industry leadership benchmarks", "third strength with team composition and startup success rate data", "fourth strength with relevant background and industry network validation", "fifth strength with execution capability and track record assessment"],
          "improvements": ["exactly 4-5 weaknesses identifying actual team gaps and experience deficiencies combined with industry execution risks", "another weakness highlighting skill deficiencies with hiring challenges and industry competency gaps", "third weakness about experience limitations with team scaling risks and leadership capability gaps", "fourth weakness regarding team composition deficiencies with hiring market challenges and retention risks", "fifth weakness about execution capability gaps with team building costs and advisory dependency risks"]
        },
        "execution_plan": {
          "score": number (1-100),
          "analysis": "detailed analysis that equally weighs their execution planning AND industry execution benchmarks/data",
          "strengths": ["exactly 4-5 strengths balancing their planning clarity with execution feasibility data", "another strength with milestone realism and industry timeline benchmarks", "third strength with resource planning and startup capital efficiency metrics", "fourth strength with goal specificity and success probability analysis", "fifth strength with implementation strategy and industry best practices alignment"],
          "improvements": ["exactly 4-5 weaknesses identifying actual execution planning gaps and timeline unreliability combined with industry failure risks", "another weakness highlighting resource estimation deficiencies with burn rate dangers and capital requirement underestimation", "third weakness about milestone planning gaps with execution barrier underestimation and implementation cost challenges", "fourth weakness regarding goal specificity deficiencies with market entry timeline risks and scaling execution gaps", "fifth weakness about implementation strategy limitations with execution success rate challenges and industry benchmark gaps"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback that integrates their form responses with extensive market context, data points, and industry insights",
        "key_factors": ["factor balancing their strongest answers with market validation and specific data", "factor balancing their weakest responses with market challenges and metrics", "factor about overall application quality with industry positioning and benchmarks"],
        "next_steps": ["specific recommendation based on gaps in responses and market data", "another step with market-informed guidance and industry benchmarks", "third step with concrete actions supported by industry insights"],
        "assessment_points": ["MANDATORY: This point must contain specific market size (e.g., $X billion), growth rate (e.g., X% CAGR), and at least 2 other quantitative metrics like CAC ($X), competitive spending ($X), or success rates (X%) while evaluating their application quality and market positioning", "MANDATORY: This point must include TAM/SAM figures ($X billion addressable market), customer metrics (e.g., $X average revenue per customer), competitive benchmarks (e.g., competitors with X% market share), and adoption timelines (X months) integrated with assessment of their business model and execution capability", "MANDATORY: This point must feature pricing data ($X per unit), market penetration rates (X% adoption), cost analysis ($X operational costs), and industry failure rates (X% of startups fail) combined with evaluation of their competitive differentiation and team strength", "MANDATORY: This point must contain customer acquisition metrics ($X CAC, X-month payback), market growth data (X% annual growth), competitive landscape analysis (X players spending $X annually), and regulatory cost impacts ($X compliance costs) while assessing their go-to-market strategy and market timing", "MANDATORY: This point must include financial benchmarks (X% gross margins, $X average deal size), market maturity indicators (X years to adoption), competitive response data ($X R&D spending by incumbents), and scaling metrics (X% revenue growth typical) integrated with their execution plan evaluation", "MANDATORY: This point must feature market validation data ($X billion current market size expanding to $X billion by 20XX), customer behavior metrics (X% conversion rates, $X customer lifetime value), and competitive positioning costs ($X annual marketing spend) combined with overall investment potential assessment", "MANDATORY: This point must contain comprehensive market analysis including sector growth (X% CAGR over X years), barrier-to-entry costs ($X typical investment required), success probability (X% of similar companies achieve profitability), and resource requirements ($X funding needed for next X months) while providing final recommendation rationale"]
      }
    }

    CRITICAL REQUIREMENTS FOR ASSESSMENT POINTS:
    - EVERY assessment point MUST contain at least 4-5 specific numbers, dollar amounts, percentages, or quantitative metrics
    - MANDATORY inclusion of market size data, growth percentages, cost figures, competitive metrics, and success rates in EVERY point
    - Generate natural, flowing statements that seamlessly blend response evaluation with extensive quantitative market data
    - Do NOT use prefixes like "Assessment point 1" or "Assessment" - write as clean, professional investment analysis statements
    - Focus on providing actionable investment insights supported by concrete market numbers and financial metrics

    CRITICAL REQUIREMENTS FOR WEAKNESSES:
    - Focus on identifying actual problems, gaps, and limitations - NOT providing recommendations
    - Express weaknesses as deficiencies, risks, and challenges they face
    - Avoid phrases like "should improve" or "needs to" - instead use "lacks", "shows gaps in", "faces risks from", "demonstrates deficiencies in"
    - Combine response quality issues with market data showing the challenges and barriers they face

    Remember: Give EQUAL importance to both the applicant's actual answers AND relevant market data/industry insights. Generate EXACTLY 6-7 assessment points that are clean, natural statements without prefixes. Each assessment point MUST include multiple specific market numbers, dollar amounts, growth rates, and industry metrics seamlessly integrated with answer evaluation. Each strength and weakness must integrate both aspects with specific data points and metrics. Focus weaknesses on actual problems and gaps, not improvement recommendations. All scores must be on a 1-100 scale.
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
            content: 'You are an expert startup evaluator for IIT Bombay. Give EQUAL weight to both the quality of applicant responses AND relevant market data/industry insights. Generate EXACTLY 6-7 clean, natural assessment points that MUST include specific numbers in every single point - market sizes in dollars, growth rates as percentages, customer acquisition costs, competitive spending figures, success rates, and other quantitative metrics. EVERY assessment point must contain at least 4-5 specific numbers, dollar amounts, or percentages. Do NOT use prefixes like "Assessment point 1", "Assessment point 2", or start with "Assessment". Write them as natural, flowing investment analysis statements that seamlessly blend response analysis with extensive quantitative market data and financial metrics. Provide exactly 4-5 strengths and 4-5 weaknesses for each section. For weaknesses, focus on identifying actual flaws, gaps, risks, and limitations - NOT recommendations for improvement. Express weaknesses as deficiencies and challenges they face, using phrases like "lacks", "shows gaps in", "faces risks from", "demonstrates deficiencies in" rather than "should improve" or "needs to". Include specific data points, growth rates, market sizes, competitive dynamics, and industry benchmarks with numbers in every strength and weakness. Provide thorough analysis in valid JSON format only. All scores must be on a scale of 1-100. Do not wrap your response in markdown code blocks - return only the raw JSON object.'
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
            
            // Add improvements (now actually weaknesses)
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
