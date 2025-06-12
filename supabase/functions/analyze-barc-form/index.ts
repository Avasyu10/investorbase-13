
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

    // Prepare the analysis prompt that prioritizes form answers with market data as supporting context
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application with PRIMARY FOCUS on the applicant's answers to the form questions. Use market data and industry insights as SUPPORTING CONTEXT to validate or challenge their responses, but the core evaluation should be based on what they've actually written.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}
    - Submitter Email: ${submission.submitter_email || 'Not provided'}

    Application Responses (PRIMARY EVALUATION CRITERIA):

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

    For each section:
    1. START with analyzing what the applicant actually wrote in their answer
    2. Evaluate their response against the specific criteria for that question
    3. Use market data and industry trends as SUPPORTING EVIDENCE to either:
       - Validate their claims and understanding
       - Highlight gaps or inconsistencies in their responses
       - Provide additional context that strengthens or weakens their position

    For strengths and weaknesses:
    - Base them primarily on the quality and depth of their answers with the market related data based on the company or the industry.
    - Use market insights to support your assessment (e.g., "Their understanding of X is validated by recent industry trend Y showing Z%")
    - Focus on what they demonstrated they know vs. don't know through their responses and also the market data

    For overall assessment points:
    - Should be a mixed assessment in their actual answers but enriched with relevant market context
    - Include 3-4 specific market data points per assessment point to provide supporting evidence
    - Each point should clearly connect their response to broader market realities

    Please provide a detailed analysis in the following JSON format. IMPORTANT: All scores must be on a scale of 1-5 (not 1-10):

    {
      "overall_score": number (1-5),
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from the application)",
        "stage": "string (based on their responses - Idea, Prototype, Early Revenue, Growth)",
        "introduction": "string (2-3 sentence description based on their executive summary and responses)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-5),
          "analysis": "detailed analysis that STARTS with evaluating their actual answer to question 1, then uses market context to validate or challenge their understanding of the problem and timing",
          "strengths": ["strength based on their answer quality, supported by market validation", "another strength from their response with industry context"],
          "improvements": ["improvement area based on gaps in their answer, with market data showing what they missed", "another improvement with specific recommendations"]
        },
        "market_opportunity": {
          "score": number (1-5),
          "analysis": "detailed analysis that STARTS with evaluating their customer discovery response (question 2), then uses market size data and trends to assess the validity of their market understanding",
          "strengths": ["strength based on their market understanding demonstrated in their answer, validated by market data", "another strength from their customer acquisition approach with industry benchmarks"],
          "improvements": ["improvement area based on what their answer revealed they don't understand about the market", "another gap in their market analysis with supporting data"]
        },
        "competitive_advantage": {
          "score": number (1-5),
          "analysis": "detailed analysis that STARTS with evaluating their competitive advantage claims (question 3), then uses competitive landscape data to assess the strength of their positioning",
          "strengths": ["strength based on the uniqueness they described, supported by competitive analysis", "another strength from their moat description with market validation"],
          "improvements": ["improvement based on competitive blind spots in their answer", "another area where their competitive analysis needs strengthening"]
        },
        "team_strength": {
          "score": number (1-5),
          "analysis": "detailed analysis that STARTS with evaluating their team background description (question 4), then considers industry requirements and successful team patterns as context",
          "strengths": ["strength based on the experience they described, with industry relevance context", "another strength from their team composition with market benchmarks"],
          "improvements": ["improvement based on skill gaps evident in their team description", "another team development need with industry context"]
        },
        "execution_plan": {
          "score": number (1-5),
          "analysis": "detailed analysis that STARTS with evaluating their incubation goals and milestones (question 5), then uses industry execution benchmarks to assess feasibility",
          "strengths": ["strength based on the clarity of their goals, with execution feasibility context", "another strength from their milestone planning with industry timelines"],
          "improvements": ["improvement based on gaps in their execution planning", "another area where their timeline or resource planning needs refinement"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback that synthesizes their form responses with market context, focusing on what they demonstrated they understand vs. gaps in their knowledge",
        "key_factors": ["factor based on their strongest answers with market validation", "factor based on their weakest responses with market context", "factor about overall application quality with industry positioning"],
        "next_steps": ["specific recommendation based on gaps in their responses", "another step with market-informed guidance", "third step with concrete actions for improvement"],
        "assessment_points": ["Assessment based on their problem definition combined with market data showing the ${submission.company_name || 'company'}'s target market is worth $X billion and growing at Y% annually", "Analysis of their customer discovery approach reveals Z understanding, while industry data shows similar companies achieve $A customer acquisition costs", "Their competitive positioning shows B level of differentiation, supported by market analysis indicating C% of companies in this space have similar advantages", "Team evaluation based on their background demonstrates D expertise level, with industry benchmarks showing E% success rate for similar team compositions", "Execution planning assessment shows F level of clarity, with market timing analysis indicating G% probability of success given current industry trends"]
      }
    }

    Remember: The applicant's actual answers are your PRIMARY source for evaluation. Market data should SUPPORT and VALIDATE your assessment of their responses, not replace evaluation of what they actually wrote. Focus on what their answers reveal about their understanding, preparedness, and capability.
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API for form-focused analysis with market context...');
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
            content: 'You are an expert startup evaluator for IIT Bombay. Your PRIMARY focus is evaluating the quality and depth of applicant responses to form questions. Use market data as SUPPORTING CONTEXT to validate their understanding, not as the main evaluation criteria. Provide thorough analysis in valid JSON format only. All scores must be on a scale of 1-5. Assessment points should be grounded in their actual answers but enriched with relevant market context (1-2 data points per point). Do not wrap your response in markdown code blocks - return only the raw JSON object.'
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

    // Ensure the overall score is properly normalized to 1-5 scale
    if (analysisResult.overall_score > 5) {
      console.log('Normalizing score from', analysisResult.overall_score, 'to 5-point scale');
      analysisResult.overall_score = Math.min(Math.round(analysisResult.overall_score / 2), 5);
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
