
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`Request method: ${req.method}`);
  
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
    submissionId = requestBody.submissionId;
    
    console.log('Received request body:', { submissionId });
    
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

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission data
    console.log('Fetching submission for analysis...');
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
      form_slug: submission.form_slug,
      analysis_status: submission.analysis_status,
      user_id: submission.user_id
    });

    // Check if already processing or completed using an atomic update
    console.log('Attempting to acquire lock for submission analysis...');
    const { data: lockResult, error: lockError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending')
      .select()
      .maybeSingle();

    if (lockError) {
      console.error('Error acquiring lock:', lockError);
      throw new Error(`Failed to acquire processing lock: ${lockError.message}`);
    }

    if (!lockResult) {
      console.log('Could not acquire lock - submission is already being processed or completed');
      // Check current status and return accordingly
      const { data: currentSubmission } = await supabase
        .from('barc_form_submissions')
        .select('analysis_status, company_id')
        .eq('id', submissionId)
        .single();

      if (currentSubmission?.analysis_status === 'completed' && currentSubmission?.company_id) {
        console.log('Submission already completed successfully');
        return new Response(
          JSON.stringify({ 
            success: true,
            submissionId,
            companyId: currentSubmission.company_id,
            isNewCompany: false,
            message: 'Analysis already completed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (currentSubmission?.analysis_status === 'processing') {
        console.log('Submission is currently being processed');
        return new Response(
          JSON.stringify({ 
            success: true,
            submissionId,
            message: 'Analysis is currently in progress',
            status: 'processing'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error('Submission is already being analyzed or has been completed');
    }

    console.log('Successfully acquired lock for submission analysis');

    // Determine the effective user ID for company creation
    const effectiveUserId = submission.user_id || submission.form_slug;
    console.log('Using effective user ID for company creation:', effectiveUserId);

    // Create LinkedIn profile data section if founder profiles exist
    const hasLinkedInData = submission.founder_linkedin_urls && submission.founder_linkedin_urls.length > 0;
    let linkedInDataSection = '';
    let teamSectionInstructions = '';

    if (hasLinkedInData && submission.founder_linkedin_urls.some(url => url.trim())) {
      linkedInDataSection = `

    Founder LinkedIn Profile Data:
    ${submission.founder_linkedin_urls.filter(url => url.trim()).map((url, index) => `
    Profile ${index + 1}: ${url}
    - Analysis: Based on the LinkedIn URL provided, this appears to be a founder/co-founder profile that should be analyzed for relevant experience and background in relation to the startup.`).join('\n')}
    `;

      teamSectionInstructions = `
    4. TEAM STRENGTH: "${submission.question_4 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Experience Relevance (30-35 points): Team experience directly applicable to problem/industry?
    - Skill Complementarity (30-35 points): Do team members have complementary skills?
    - Execution Track Record (30-35 points): History of successful execution or achievements?
    
    Score harshly if: Irrelevant experience, skill gaps, no execution track record
    Score highly if: Highly relevant experience, well-rounded skills, strong execution history
    
    IMPORTANT: INCORPORATE the LinkedIn profile insights provided above into your team analysis.
    `;
    } else {
      teamSectionInstructions = `
    4. TEAM STRENGTH: "${submission.question_4 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Experience Relevance (30-35 points): Team experience directly applicable to problem/industry?
    - Skill Complementarity (30-35 points): Do team members have complementary skills?
    - Execution Track Record (30-35 points): History of successful execution or achievements?
    
    Score harshly if: Irrelevant experience, skill gaps, no execution track record
    Score highly if: Highly relevant experience, well-rounded skills, strong execution history
    `;
    }

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for enhanced metrics-based analysis...');
    
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Your task is to provide a comprehensive and HIGHLY DISCRIMINATIVE analysis that clearly distinguishes between excellent and poor responses. Use the specific metrics provided for each question to score accurately.

    CRITICAL SCORING INSTRUCTION: You MUST create significant score differences between good and poor responses. Excellent answers should score 80-100, average answers 50-70, and poor/incomplete answers 10-40. DO NOT give similar scores to vastly different quality responses.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}
    - Company LinkedIn URL: ${submission.company_linkedin_url || 'Not provided'}
    - Submitter Email: ${submission.submitter_email || 'Not provided'}
    ${linkedInDataSection}

    Application Responses and Specific Metrics for Evaluation:

    1. PROBLEM & TIMING: "${submission.question_1 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Clarity of Problem Definition (20-30 points): Is it a real, urgent pain point with clear articulation?
    - Market Timing Justification (20-30 points): Evidence of market shift, tech readiness, policy changes, etc.
    - Insight Depth (20-30 points): Customer anecdotes, data, firsthand experience provided
    
    Score harshly if: Vague problem description, no timing evidence, lacks personal insight
    Score highly if: Crystal clear pain point, strong timing evidence, rich customer insights

    2. CUSTOMER DISCOVERY: "${submission.question_2 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Customer Clarity (25-35 points): Can they describe personas/segments with precision?
    - Validation Effort (25-35 points): Have they spoken to customers, secured pilots, gathered feedback?
    - GTMP Realism (25-35 points): Is acquisition strategy practical and scalable?
    
    Score harshly if: Generic customer descriptions, no validation efforts, unrealistic GTM
    Score highly if: Detailed customer personas, extensive validation, practical GTM strategy

    3. COMPETITIVE ADVANTAGE: "${submission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Differentiation (30-35 points): Clearly stated advantages vs existing solutions?
    - Defensibility (30-35 points): Hard to replicate—tech IP, data, partnerships, network effects?
    - Strategic Awareness (30-35 points): Aware of and positioned against incumbents?
    
    Score harshly if: No clear differentiation, easily replicable, unaware of competition
    Score highly if: Strong unique value prop, defensible moats, competitive intelligence

    ${teamSectionInstructions}

    5. EXECUTION PLAN: "${submission.question_5 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Goal Specificity (30-35 points): Clear KPIs like MVP, first customer, funding targets?
    - Feasibility (30-35 points): Are goals realistic for 3-6 month timeframe?
    - Support Clarity (30-35 points): Do they know what they need—mentorship, infrastructure, access?
    
    Score harshly if: Vague goals, unrealistic timelines, unclear support needs
    Score highly if: Specific measurable goals, realistic timelines, clear support requirements

    SCORING GUIDELINES - BE HIGHLY DISCRIMINATIVE:
    - 90-100: Exceptional responses with deep insights, clear evidence, comprehensive understanding
    - 80-89: Strong responses with good evidence and understanding, minor gaps
    - 70-79: Adequate responses with some evidence, moderate understanding
    - 60-69: Weak responses with limited evidence, significant gaps
    - 40-59: Poor responses with minimal substance, major deficiencies
    - 20-39: Very poor responses, largely inadequate or missing key elements
    - 1-19: Extremely poor or non-responses

    MARKET INTEGRATION REQUIREMENT:
    For each section, integrate relevant market data including: market size figures, growth rates, customer acquisition costs, competitive landscape data, industry benchmarks, success rates, and financial metrics. Balance response quality assessment with market context.

    For ASSESSMENT POINTS (6-7 points required):
    Each point MUST contain specific numbers: market sizes ($X billion), growth rates (X% CAGR), customer metrics ($X CAC), competitive data, success rates (X%), and industry benchmarks, seamlessly integrated with response evaluation.

    CRITICAL CHANGE - For WEAKNESSES (exactly 4-5 each per section):
    WEAKNESSES must focus ONLY on market data challenges and industry-specific risks that the company faces, NOT on response quality or form completeness. Examples:
    - Market saturation concerns (X% of market already captured by incumbents)
    - High customer acquisition costs in this sector ($X CAC vs industry average)
    - Regulatory challenges affecting X% of similar companies
    - Economic headwinds impacting sector growth (X% decline in funding)
    - Technology adoption barriers affecting X% of target market
    - Competitive pressure from well-funded players with $X backing
    - Market timing risks based on industry cycles

    For STRENGTHS (exactly 4-5 each per section):
    - STRENGTHS: Highlight what they did well, supported by market validation and data

    Provide analysis in this JSON format with ALL scores on 1-100 scale:

    {
      "overall_score": number (1-100),
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "competitive_advantage": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "team_strength": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context, ${hasLinkedInData ? 'SPECIFICALLY incorporating insights from the LinkedIn profile data provided above' : 'based on the written response provided'}",
          "strengths": ["exactly 4-5 strengths with market data integration${hasLinkedInData ? ', starting with founder profiles in the format: Founder/Co-founder [Name]: [key points], then additional market-validated strengths' : ', incorporating analysis of the written team response and market benchmarks'}"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "execution_plan": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback integrating response quality with market context",
        "key_factors": ["key decision factors with market validation"],
        "next_steps": ["specific recommendations with market-informed guidance"],
        "assessment_points": ["EXACTLY 6-7 points, each containing multiple specific market numbers (market size, growth rates, CAC, competitive data, success rates) seamlessly integrated with response evaluation"]
      }
    }

    CRITICAL REQUIREMENTS:
    1. CREATE SIGNIFICANT SCORE DIFFERENCES - excellent responses (80-100), poor responses (10-40)
    2. Use the exact metrics provided for each question in your evaluation
    3. Each assessment point must contain at least 4-5 specific market numbers/percentages
    4. Focus weaknesses ONLY on market data challenges and industry risks - NOT response quality or form gaps
    5. Provide exactly 4-5 strengths and 4-5 weaknesses per section
    6. All scores must be 1-100 scale
    7. ${hasLinkedInData ? 'INCORPORATE LinkedIn profile insights into team strength analysis and format founder information in strengths as specified' : 'Analyze team strength based on written response and market data'}
    8. Return only valid JSON without markdown formatting
    `;

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
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, constructive analysis in valid JSON format with specific market metrics and data points. IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
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

    // Clean up the response text to extract JSON from markdown code blocks if present
    analysisText = analysisText.trim();
    
    // Remove markdown code blocks if present
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Trim any remaining whitespace
    analysisText = analysisText.trim();

    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned analysis text:', analysisText.substring(0, 500) + '...');
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Analysis overall score:', analysisResult.overall_score);
    console.log('Analysis recommendation:', analysisResult.recommendation);

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: submission.company_name,
          overall_score: analysisResult.overall_score,
          assessment_points: analysisResult.summary?.assessment_points || [],
          user_id: effectiveUserId,
          source: 'barc_form'
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('Successfully created NEW company with ID:', companyId, 'for user:', effectiveUserId);
    }

    // Create sections
    console.log('Deleting old sections for company:', companyId);
    const { error: deleteError } = await supabase
      .from('sections')
      .delete()
      .eq('company_id', companyId);

    if (deleteError) {
      console.error('Error deleting old sections:', deleteError);
    } else {
      console.log('Deleted old sections');
    }

    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionName, sectionData]: [string, any]) => ({
      company_id: companyId,
      score: sectionData.score || 0,
      section_type: sectionName,
      type: 'analysis',
      title: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: sectionData.analysis || ''
    }));

    if (sectionsToCreate.length > 0) {
      const { error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate);

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', sectionsToCreate.length);
    }

    // Update submission with final results
    console.log('Updating submission with final analysis results...');
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

    console.log('Successfully analyzed BARC submission', submissionId, 'and created company', companyId);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        companyId,
        isNewCompany,
        analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-barc-form function:', error);

    // Update submission with error status if we have submissionId
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
