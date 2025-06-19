import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retry mechanism to handle timing issues
    let submission = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!submission && retryCount < maxRetries) {
      console.log(`Attempt ${retryCount + 1} to fetch submission...`);
      
      if (retryCount > 0) {
        // Add progressive delay for retries
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      const { data: fetchedSubmission, error: fetchError } = await supabase
        .from('eureka_form_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();

      if (fetchError) {
        console.error(`Fetch error on attempt ${retryCount + 1}:`, fetchError);
        if (retryCount === maxRetries - 1) {
          throw new Error(`Failed to fetch submission after ${maxRetries} attempts: ${fetchError.message}`);
        }
      } else if (fetchedSubmission) {
        submission = fetchedSubmission;
        console.log('Successfully fetched submission on attempt', retryCount + 1);
      } else {
        console.warn(`Submission not found on attempt ${retryCount + 1}, retrying...`);
      }
      
      retryCount++;
    }

    if (!submission) {
      throw new Error(`Submission not found after ${maxRetries} attempts`);
    }

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      form_slug: submission.form_slug,
      analysis_status: submission.analysis_status,
      user_id: submission.user_id,
      company_type: submission.company_type,
      poc_name: submission.poc_name,
      phoneno: submission.phoneno
    });

    // Check if already processing or completed using an atomic update
    console.log('Attempting to acquire lock for submission analysis...');
    const { data: lockResult, error: lockError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .in('analysis_status', ['pending', 'failed'])
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
        .from('eureka_form_submissions')
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

    // Process LinkedIn data for team analysis
    const founderLinkedInData = [];
    if (submission.founder_linkedin_urls && Array.isArray(submission.founder_linkedin_urls)) {
      for (const url of submission.founder_linkedin_urls) {
        if (url && typeof url === 'string' && url.trim()) {
          try {
            const { data: linkedInData } = await supabase
              .from('linkedin_profile_scrapes')
              .select('content')
              .eq('url', url.trim())
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (linkedInData?.content) {
              founderLinkedInData.push({
                url: url.trim(),
                content: linkedInData.content
              });
            }
          } catch (error) {
            console.warn(`Error fetching LinkedIn data for ${url}:`, error);
          }
        }
      }
    }

    // Build LinkedIn data section for prompt
    const linkedInDataSection = founderLinkedInData.length > 0
      ? `\n\nFounder LinkedIn Data:\n${founderLinkedInData.map((data, index) => 
          `Founder ${index + 1} LinkedIn (${data.url}):\n${data.content}`
        ).join('\n\n')}`
      : '\n\nNo LinkedIn data available for founders.';

    // Build analysis prompt with submission data
    const analysisPrompt = `
    You are an expert startup evaluator with STRICT AND HIGHLY VARIED SCORING STANDARDS. Your primary goal is to create MAXIMUM SCORE VARIATION between submissions, ranging from very low scores (20-40) for weak applications to very high scores (85-95) for exceptional ones. Most submissions should fall in the middle ranges (45-75).

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and HIGHLY VARIED EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    SCORING CALCULATION FOR PROBLEM & SOLUTION (100 points total) - BE EXTREMELY STRICT:
    Step 1: Problem Clarity & Significance (25 pts):
    - 22-25: Revolutionary problem with massive market urgency and compelling data
    - 18-21: Strong problem with clear market validation and urgency
    - 14-17: Good problem identification with some market evidence
    - 10-13: Basic problem awareness but limited validation
    - 6-9: Weak problem identification with minimal evidence
    - 3-5: Poor problem clarity with mostly assumptions
    - 0-2: No clear problem or completely misunderstood market need

    Step 2: Solution Innovation & Feasibility (25 pts):
    - 22-25: Groundbreaking solution with proven technical feasibility
    - 18-21: Highly innovative approach with realistic implementation
    - 14-17: Creative solution with reasonable feasibility
    - 10-13: Basic solution but unclear implementation path
    - 6-9: Weak solution with questionable viability
    - 3-5: Poor solution that barely addresses the problem
    - 0-2: No viable solution or completely unrealistic approach

    Step 3: Market Understanding (25 pts):
    - 22-25: Deep market expertise with comprehensive data analysis
    - 18-21: Strong market research with competitive intelligence
    - 14-17: Good market awareness with some validation
    - 10-13: Basic market knowledge but mostly surface-level
    - 6-9: Limited understanding with significant knowledge gaps
    - 3-5: Poor market awareness with major misconceptions
    - 0-2: No demonstrated market understanding

    Step 4: Technical Depth & Implementation (25 pts):
    - 22-25: Sophisticated technical strategy with detailed roadmap
    - 18-21: Strong technical planning with clear execution steps
    - 14-17: Decent technical consideration with some planning
    - 10-13: Basic technical awareness but lacks depth
    - 6-9: Minimal technical understanding or planning
    - 3-5: Poor technical strategy with unrealistic expectations
    - 0-2: No technical understanding demonstrated

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = PROBLEM_SOLUTION_SCORE

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    SCORING CALCULATION FOR TARGET CUSTOMERS (100 points total) - BE EXTREMELY STRICT:
    Step 1: Customer Segmentation Precision (30 pts):
    - 26-30: Laser-focused segments with detailed buyer personas and data
    - 21-25: Well-defined customer segments with clear characteristics
    - 16-20: Good customer identification with some specificity
    - 11-15: Basic segmentation but lacks precision and depth
    - 6-10: Vague customer definition with broad generalizations
    - 3-5: Poor targeting that's too broad or unclear
    - 0-2: No clear customer identification or completely off-target

    Step 2: Market Size & Accessibility (25 pts):
    - 22-25: Precise market sizing with proven acquisition channels
    - 18-21: Strong market analysis with realistic go-to-market strategy
    - 14-17: Decent market understanding with some strategy
    - 10-13: Basic market consideration but lacks strategic depth
    - 6-9: Limited market analysis with questionable assumptions
    - 3-5: Poor market understanding with unrealistic projections
    - 0-2: No market sizing or completely unrealistic expectations

    Step 3: Customer Pain Points & Payment Behavior (25 pts):
    - 22-25: Deep pain analysis with validated willingness-to-pay data
    - 18-21: Strong pain understanding with logical payment reasoning
    - 14-17: Good pain identification with some customer validation
    - 10-13: Basic pain awareness but mostly assumptions
    - 6-9: Limited pain understanding with weak reasoning
    - 3-5: Poor pain analysis with little customer insight
    - 0-2: No pain understanding or completely wrong assumptions

    Step 4: Customer Validation Evidence (20 pts):
    - 17-20: Extensive customer interviews and market validation
    - 14-16: Good validation efforts with customer feedback
    - 11-13: Some validation attempts with limited evidence
    - 7-10: Minimal validation with mostly internal assumptions
    - 4-6: Poor validation efforts with little customer contact
    - 2-3: Almost no validation attempted
    - 0-1: No customer validation shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = TARGET_CUSTOMERS_SCORE

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    SCORING CALCULATION FOR COMPETITORS (100 points total) - BE EXTREMELY STRICT:
    Step 1: Competitive Landscape Knowledge (30 pts):
    - 26-30: Comprehensive analysis of direct/indirect competitors with market intelligence
    - 21-25: Strong competitive research with key players identified
    - 16-20: Good competitive understanding with some analysis
    - 11-15: Basic competitive awareness but incomplete research
    - 6-10: Limited competitive knowledge with major gaps
    - 3-5: Poor competitive analysis with little understanding
    - 0-2: No competitive analysis or completely wrong assessment

    Step 2: Differentiation Strategy (25 pts):
    - 22-25: Compelling unique positioning with sustainable competitive advantages
    - 18-21: Strong differentiation with clear unique value
    - 14-17: Good differentiation with some competitive edge
    - 10-13: Basic differentiation but not compelling or defensible
    - 6-9: Weak differentiation with little uniqueness
    - 3-5: Poor positioning with minimal competitive advantage
    - 0-2: No differentiation strategy or copied approach

    Step 3: Competitive Analysis Depth (25 pts):
    - 22-25: In-depth competitor analysis with SWOT and market positioning
    - 18-21: Good competitive insights with detailed understanding
    - 14-17: Decent analysis with some competitive intelligence
    - 10-13: Basic competitor consideration but shallow analysis
    - 6-9: Limited competitive research with surface-level insights
    - 3-5: Poor competitor understanding with little analysis
    - 0-2: No competitive analysis or completely superficial

    Step 4: Market Positioning Strategy (20 pts):
    - 17-20: Sophisticated positioning with clear market niche and strategy
    - 14-16: Strong positioning with strategic market approach
    - 11-13: Good positioning consideration with some strategy
    - 7-10: Basic positioning but unclear strategic direction
    - 4-6: Weak positioning with little strategic thinking
    - 2-3: Poor positioning strategy with no clear direction
    - 0-1: No positioning strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = COMPETITORS_SCORE

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    SCORING CALCULATION FOR REVENUE MODEL (100 points total) - BE EXTREMELY STRICT:
    Step 1: Revenue Stream Clarity (25 pts):
    - 22-25: Multiple diversified revenue streams with proven monetization
    - 18-21: Clear revenue model with logical monetization approach
    - 14-17: Good revenue thinking with some clarity and validation
    - 10-13: Basic revenue identification but unclear execution
    - 6-9: Weak revenue model with limited strategic thinking
    - 3-5: Poor revenue strategy with unrealistic assumptions
    - 0-2: No revenue model or completely unrealistic monetization

    Step 2: Pricing Strategy & Logic (25 pts):
    - 22-25: Data-driven pricing with competitive analysis and value justification
    - 18-21: Strong pricing strategy with market research backing
    - 14-17: Good pricing consideration with some market validation
    - 10-13: Basic pricing but lacks market research or validation
    - 6-9: Weak pricing strategy with little justification
    - 3-5: Poor pricing with no market basis or logic
    - 0-2: No pricing strategy or completely arbitrary pricing

    Step 3: Financial Projections & Unit Economics (25 pts):
    - 22-25: Detailed financial models with realistic unit economics and assumptions
    - 18-21: Good financial projections with some modeling
    - 14-17: Basic financial consideration with simple projections
    - 10-13: Limited financial thinking with weak projections
    - 6-9: Poor financial understanding with unrealistic numbers
    - 3-5: Very weak financial projections with no basis
    - 0-2: No financial projections or completely unrealistic expectations

    Step 4: Scalability & Growth Strategy (25 pts):
    - 22-25: Comprehensive scalability plan with clear growth levers and metrics
    - 18-21: Strong scalability thinking with growth strategy
    - 14-17: Good scalability consideration with some planning
    - 10-13: Basic scalability awareness but limited strategic planning
    - 6-9: Weak scalability understanding with little growth strategy
    - 3-5: Poor growth planning with unrealistic scaling expectations
    - 0-2: No scalability consideration or completely unrealistic growth plans

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = REVENUE_MODEL_SCORE

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    SCORING CALCULATION FOR DIFFERENTIATION (100 points total) - BE EXTREMELY STRICT:
    Step 1: Unique Value Proposition Strength (30 pts):
    - 26-30: Revolutionary value proposition with clear customer benefits and validation
    - 21-25: Strong unique value with compelling customer benefits
    - 16-20: Good uniqueness with clear but not exceptional benefits
    - 11-15: Basic uniqueness but not particularly compelling
    - 6-10: Weak value proposition with limited differentiation
    - 3-5: Poor uniqueness with little distinguishing value
    - 0-2: No unique value proposition or copied approach

    Step 2: Defensibility & Moats (25 pts):
    - 22-25: Multiple strong defensible advantages with sustainable moats
    - 18-21: Good defensibility with some protection strategies
    - 14-17: Decent defensibility with basic competitive protection
    - 10-13: Limited defensibility with weak competitive barriers
    - 6-9: Poor defensible advantages with little protection
    - 3-5: Very weak defensibility with no real barriers
    - 0-2: No defensible advantages or easily replicated

    Step 3: Technology & Innovation Edge (25 pts):
    - 22-25: Cutting-edge technology with significant innovation and IP potential
    - 18-21: Strong technology differentiation with innovation
    - 14-17: Good technology approach with some innovation
    - 10-13: Basic technology but not particularly innovative
    - 6-9: Limited technology differentiation with little innovation
    - 3-5: Poor technology strategy with no innovation
    - 0-2: No technology differentiation or outdated approach

    Step 4: Go-to-Market Advantage (20 pts):
    - 17-20: Superior GTM strategy with unique channel advantages and partnerships
    - 14-16: Strong GTM approach with clear competitive advantages
    - 11-13: Good GTM consideration with some advantages
    - 7-10: Basic GTM thinking but not particularly advantageous
    - 4-6: Weak GTM strategy with little competitive edge
    - 2-3: Poor GTM approach with no clear advantages
    - 0-1: No GTM strategy or completely generic approach

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = DIFFERENTIATION_SCORE

    CRITICAL SCORING REQUIREMENTS FOR MAXIMUM VARIATION:

    1. CALCULATE EACH SECTION SCORE EXACTLY using the step-by-step method above
    2. For each section, you MUST show your calculation: "Step 1: X points, Step 2: Y points, Step 3: Z points, Step 4: W points. Total: X+Y+Z+W = FINAL_SCORE"
    3. BE EXTREMELY STRICT - Most submissions should score in the 35-65 range with only exceptional ones reaching 80+
    4. CREATE MAXIMUM VARIATION - Aim for at least 30-40 point differences between weak and strong submissions
    5. OVERALL SCORE = (PROBLEM_SOLUTION_SCORE × 0.25) + (TARGET_CUSTOMERS_SCORE × 0.25) + (COMPETITORS_SCORE × 0.20) + (REVENUE_MODEL_SCORE × 0.15) + (DIFFERENTIATION_SCORE × 0.15)

    STRICT RECOMMENDATION LOGIC WITH VARIED THRESHOLDS:
    - Accept: Overall score ≥ 85 AND no section below 75 (only for truly exceptional submissions)
    - Consider: Overall score 55-84 OR shows strong potential despite some weaknesses
    - Reject: Overall score < 55 OR multiple critical sections below 40

    Return analysis in this JSON format:
    {
      "overall_score": number (calculated weighted average),
      "scoring_reason": "One concise sentence explaining the key strengths and main areas needing improvement",
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (PROBLEM_SOLUTION_SCORE calculated above),
          "score_calculation": "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE",
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 detailed strengths (3-4 sentences each) with specific market data/numbers"],
          "improvements": ["exactly 4-5 detailed weaknesses (3-4 sentences each) with specific market data/numbers - NO recommendations"]
        },
        "target_customers": {
          "score": number (TARGET_CUSTOMERS_SCORE calculated above),
          "score_calculation": "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE",
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 detailed strengths (3-4 sentences each) with specific market data/numbers"],
          "improvements": ["exactly 4-5 detailed weaknesses (3-4 sentences each) with specific market data/numbers - NO recommendations"]
        },
        "competitors": {
          "score": number (COMPETITORS_SCORE calculated above),
          "score_calculation": "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE",
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 detailed strengths (3-4 sentences each) with specific market data/numbers"],
          "improvements": ["exactly 4-5 detailed weaknesses (3-4 sentences each) with specific market data/numbers - NO recommendations"]
        },
        "revenue_model": {
          "score": number (REVENUE_MODEL_SCORE calculated above),
          "score_calculation": "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE",
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 detailed strengths (3-4 sentences each) with specific market data/numbers"],
          "improvements": ["exactly 4-5 detailed weaknesses (3-4 sentences each) with specific market data/numbers - NO recommendations"]
        },
        "differentiation": {
          "score": number (DIFFERENTIATION_SCORE calculated above),
          "score_calculation": "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE",
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 detailed strengths (3-4 sentences each) with specific market data/numbers"],
          "improvements": ["exactly 4-5 detailed weaknesses (3-4 sentences each) with specific market data/numbers - NO recommendations"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive realistic feedback focusing on actual performance while providing constructive guidance",
        "key_factors": ["key factors demonstrated with realistic market validation"],
        "next_steps": ["specific realistic recommendations with market-informed guidance for growth"],
        "assessment_points": [
          "EXACTLY 8-10 detailed market-focused assessment points combining realistic startup insights with market intelligence",
          "Each point must be 3-4 sentences emphasizing realistic opportunities and challenges with market data",
          "Include market sizes, growth rates, competitive landscape metrics, funding trends, adoption rates",
          "Present market challenges realistically while identifying strategic opportunities",
          "Connect startup's approach to industry trends and market realities with balanced analysis",
          "Provide realistic analysis of market fit and strategic potential with actionable intelligence"
        ]
      }
    }

    REMEMBER: You MUST calculate each section score step-by-step and show your calculation. BE EXTREMELY STRICT to create maximum score variation (20-95 range). Keep the scoring_reason to ONE CONCISE SENTENCE only. Most submissions should score 35-65 with only exceptional ones reaching 80+.
    `;

    // Call Gemini for analysis
    console.log('Calling Gemini API for analysis...');
    
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an EXTREMELY STRICT startup evaluator with MAXIMUM SCORE VARIATION standards. Your goal is to create scores that range from 20-95 with most submissions falling in 35-65 range. You MUST calculate each section score step-by-step using the detailed metrics provided. For each section, show your calculation as "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE". BE EXTREMELY STRICT in scoring - show massive distinctions between quality levels. Only truly exceptional submissions should score above 80. Keep the scoring_reason to ONE CONCISE SENTENCE only. Return ONLY valid JSON without any markdown formatting.\n\n${analysisPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received, parsing...');

    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini');
    }

    let analysisText = geminiData.candidates[0].content.parts[0].text;
    console.log('Raw analysis text received from Gemini');

    // Clean up the response text to extract JSON
    analysisText = analysisText.trim();
    
    // Remove markdown code blocks if present
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    analysisText = analysisText.trim();

    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Cleaned analysis text:', analysisText.substring(0, 500) + '...');
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Analysis overall score:', analysisResult.overall_score);
    console.log('Analysis recommendation:', analysisResult.recommendation);
    console.log('Analysis scoring reason:', analysisResult.scoring_reason);

    // Log individual section scores for debugging
    if (analysisResult.sections) {
      console.log('Section scores:');
      Object.entries(analysisResult.sections).forEach(([sectionName, sectionData]: [string, any]) => {
        console.log(`${sectionName}: ${sectionData.score} (calculation: ${sectionData.score_calculation || 'No calculation provided'})`);
      });
    }

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const companyData = {
        name: submission.company_name,
        overall_score: analysisResult.overall_score,
        assessment_points: analysisResult.summary?.assessment_points || [],
        scoring_reason: analysisResult.scoring_reason || null,
        user_id: effectiveUserId,
        source: 'eureka_form',
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };

      console.log('Company data to insert:', companyData);
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('Successfully created NEW company with ID:', companyId);
    } else {
      console.log('Updating existing company...');
      
      const updateData = {
        overall_score: analysisResult.overall_score,
        assessment_points: analysisResult.summary?.assessment_points || [],
        scoring_reason: analysisResult.scoring_reason || null,
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };

      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateCompanyError) {
        console.error('Error updating company:', updateCompanyError);
        throw new Error(`Failed to update company: ${updateCompanyError.message}`);
      }

      console.log('Successfully updated existing company with ID:', companyId);
    }

    // Create sections
    console.log('Creating sections for company:', companyId);
    
    // Delete old sections first
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
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', sectionsToCreate.length);

      // Create section details (strengths and improvements)
      const sectionDetails = [];
      
      for (const section of createdSections) {
        const sectionKey = section.section_type;
        const sectionData = analysisResult.sections[sectionKey];
        
        if (sectionData) {
          // Add strengths
          if (sectionData.strengths && Array.isArray(sectionData.strengths)) {
            for (const strength of sectionData.strengths) {
              sectionDetails.push({
                section_id: section.id,
                detail_type: 'strength',
                content: strength
              });
            }
          }
          
          // Add improvements (now with 4-5 detailed points with market data)
          if (sectionData.improvements && Array.isArray(sectionData.improvements)) {
            for (const improvement of sectionData.improvements) {
              sectionDetails.push({
                section_id: section.id,
                detail_type: 'weakness',
                content: improvement
              });
            }
          }
        }
      }

      if (sectionDetails.length > 0) {
        const { error: detailsError } = await supabase
          .from('section_details')
          .insert(sectionDetails);

        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }

        console.log('Created section details:', sectionDetails.length);
      }
    }

    // Update submission with final results
    console.log('Updating submission with final analysis results...');
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
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

    console.log('Successfully analyzed Eureka submission', submissionId, 'and', isNewCompany ? 'created' : 'updated', 'company', companyId);

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
    console.error('Error in analyze-eureka-form function:', error);

    // Update submission with error status if we have submissionId
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase
            .from('eureka_form_submissions')
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
