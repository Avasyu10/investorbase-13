
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
    You are an expert startup evaluator with STRICT EVALUATION STANDARDS and PRECISE SCORING. Your goal is to provide accurate assessment based on detailed evaluation metrics.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and DETAILED EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    SCORING CALCULATION FOR PROBLEM & SOLUTION (100 points total):
    Step 1: Problem Clarity & Significance (25 pts):
    - 23-25: Crystal clear problem with quantified impact and urgency
    - 19-22: Clear problem with good articulation but missing some specifics
    - 15-18: Adequate problem identification but lacks depth or specificity
    - 10-14: Vague problem statement with limited understanding
    - 5-9: Poor problem articulation, generic or unclear
    - 0-4: No clear problem identified

    Step 2: Solution Innovation & Feasibility (25 pts):
    - 23-25: Highly innovative, technically sound, perfect problem-solution fit
    - 19-22: Good innovation with solid feasibility and clear connection to problem
    - 15-18: Adequate solution with reasonable feasibility but limited innovation
    - 10-14: Basic solution with questionable feasibility or weak problem connection
    - 5-9: Poor solution with significant feasibility concerns
    - 0-4: No viable solution or completely unrealistic approach

    Step 3: Market Understanding (25 pts):
    - 23-25: Deep market insights with data, perfect timing, competitive awareness
    - 19-22: Good market understanding with some data and competitive knowledge
    - 15-18: Basic market awareness but lacks depth or specific insights
    - 10-14: Limited market understanding with generic insights
    - 5-9: Poor market knowledge with incorrect assumptions
    - 0-4: No market understanding demonstrated

    Step 4: Technical Depth & Implementation (25 pts):
    - 23-25: Excellent technical depth with clear implementation roadmap
    - 19-22: Good technical understanding with reasonable implementation plan
    - 15-18: Basic technical awareness but lacks implementation details
    - 10-14: Limited technical understanding with vague implementation
    - 5-9: Poor technical grasp with unrealistic implementation
    - 0-4: No technical understanding or implementation plan

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = PROBLEM_SOLUTION_SCORE

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    SCORING CALCULATION FOR TARGET CUSTOMERS (100 points total):
    Step 1: Customer Segmentation Precision (30 pts):
    - 27-30: Precise segmentation with demographics, psychographics, and behaviors
    - 23-26: Good segmentation with most key characteristics identified
    - 18-22: Adequate segmentation but missing important details
    - 12-17: Basic segmentation with limited specificity
    - 6-11: Poor segmentation, too broad or vague
    - 0-5: No clear customer segmentation

    Step 2: Market Size & Accessibility (25 pts):
    - 23-25: Clear TAM/SAM/SOM with specific acquisition strategies
    - 19-22: Good market sizing with reasonable acquisition approach
    - 15-18: Basic market understanding but limited acquisition strategy
    - 10-14: Poor market sizing with unclear acquisition approach
    - 5-9: Inadequate market understanding and no clear acquisition plan
    - 0-4: No market sizing or customer acquisition strategy

    Step 3: Customer Pain Points & Payment Behavior (25 pts):
    - 23-25: Detailed pain point analysis with payment validation
    - 19-22: Good pain understanding with reasonable payment assumptions
    - 15-18: Basic pain awareness but limited payment validation
    - 10-14: Superficial pain understanding with weak payment logic
    - 5-9: Poor pain identification with no payment validation
    - 0-4: No understanding of customer pain or payment behavior

    Step 4: Customer Validation Evidence (20 pts):
    - 18-20: Strong validation with multiple customer touchpoints and feedback
    - 15-17: Good validation with some customer research evidence
    - 11-14: Basic validation attempts with limited evidence
    - 7-10: Minimal validation with weak evidence
    - 3-6: No meaningful validation but claims of customer contact
    - 0-2: No customer validation attempted

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = TARGET_CUSTOMERS_SCORE

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    SCORING CALCULATION FOR COMPETITORS (100 points total):
    Step 1: Competitive Landscape Knowledge (30 pts):
    - 27-30: Complete competitive map with direct, indirect, and substitute competitors
    - 23-26: Good competitive knowledge with most key players identified
    - 18-22: Adequate competitive awareness but missing some important players
    - 12-17: Basic competitive knowledge with significant gaps
    - 6-11: Poor competitive understanding with major oversights
    - 0-5: No meaningful competitive analysis

    Step 2: Differentiation Strategy (25 pts):
    - 23-25: Strong differentiation with sustainable competitive advantages
    - 19-22: Good differentiation with reasonable competitive positioning
    - 15-18: Basic differentiation but advantages may not be sustainable
    - 10-14: Weak differentiation with easily replicable advantages
    - 5-9: Poor differentiation with no clear competitive edge
    - 0-4: No differentiation strategy identified

    Step 3: Competitive Analysis Depth (25 pts):
    - 23-25: Deep analysis of competitor strategies, pricing, and market share
    - 19-22: Good competitor analysis with key insights
    - 15-18: Basic competitor analysis but lacks strategic depth
    - 10-14: Superficial competitor analysis with limited insights
    - 5-9: Poor competitor analysis with incorrect information
    - 0-4: No competitive analysis provided

    Step 4: Market Positioning Strategy (20 pts):
    - 18-20: Sophisticated positioning strategy with clear market narrative
    - 15-17: Good positioning with reasonable competitive strategy
    - 11-14: Basic positioning but lacks strategic depth
    - 7-10: Weak positioning with unclear competitive strategy
    - 3-6: Poor positioning with no clear strategy
    - 0-2: No positioning strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = COMPETITORS_SCORE

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    SCORING CALCULATION FOR REVENUE MODEL (100 points total):
    Step 1: Revenue Stream Clarity (25 pts):
    - 23-25: Multiple clear revenue streams with detailed monetization
    - 19-22: Clear primary revenue stream with good monetization logic
    - 15-18: Basic revenue stream identification but lacks detail
    - 10-14: Unclear revenue streams with weak monetization logic
    - 5-9: Poor revenue understanding with questionable viability
    - 0-4: No clear revenue model identified

    Step 2: Pricing Strategy & Logic (25 pts):
    - 23-25: Sophisticated pricing strategy with market research and value justification
    - 19-22: Good pricing logic with reasonable market positioning
    - 15-18: Basic pricing strategy but lacks market validation
    - 10-14: Weak pricing logic with poor market understanding
    - 5-9: Poor pricing with no clear justification
    - 0-4: No pricing strategy provided

    Step 3: Financial Projections & Unit Economics (25 pts):
    - 23-25: Detailed unit economics with realistic financial projections
    - 19-22: Good unit economics understanding with reasonable projections
    - 15-18: Basic financial understanding but lacks unit economic depth
    - 10-14: Weak financial projections with poor unit economics
    - 5-9: Unrealistic financial assumptions with no unit economic basis
    - 0-4: No financial projections or unit economics provided

    Step 4: Scalability & Growth Strategy (25 pts):
    - 23-25: Highly scalable model with clear growth strategy and market expansion
    - 19-22: Good scalability with reasonable growth plans
    - 15-18: Moderately scalable with basic growth strategy
    - 10-14: Limited scalability with unclear growth path
    - 5-9: Poor scalability with no clear growth strategy
    - 0-4: No consideration of scalability or growth

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = REVENUE_MODEL_SCORE

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    SCORING CALCULATION FOR DIFFERENTIATION (100 points total):
    Step 1: Unique Value Proposition Strength (30 pts):
    - 27-30: Breakthrough innovation with significant unique value
    - 23-26: Strong unique value with clear customer benefits
    - 18-22: Moderate uniqueness with good value proposition
    - 12-17: Limited uniqueness with basic value proposition
    - 6-11: Weak uniqueness with questionable value
    - 0-5: No clear unique value proposition

    Step 2: Defensibility & Moats (25 pts):
    - 23-25: Strong moats with patents, network effects, or significant barriers
    - 19-22: Good defensibility with reasonable competitive protection
    - 15-18: Moderate defensibility but may be vulnerable to competition
    - 10-14: Weak defensibility with low barriers to entry
    - 5-9: Poor defensibility with easily replicable offering
    - 0-4: No defensible competitive advantages

    Step 3: Technology & Innovation Edge (25 pts):
    - 23-25: Cutting-edge technology with significant advancement
    - 19-22: Good technology with meaningful improvements
    - 15-18: Moderate technology advancement with some improvements
    - 10-14: Limited technology differentiation with minimal advancement
    - 5-9: Poor technology with no clear advancement
    - 0-4: No technology differentiation identified

    Step 4: Go-to-Market Advantage (20 pts):
    - 18-20: Innovative GTM strategy with significant customer acquisition advantages
    - 15-17: Good GTM approach with reasonable customer acquisition strategy
    - 11-14: Basic GTM strategy but lacks innovation or clear advantages
    - 7-10: Weak GTM approach with unclear customer acquisition
    - 3-6: Poor GTM strategy with no clear customer acquisition plan
    - 0-2: No GTM strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = DIFFERENTIATION_SCORE

    CRITICAL SCORING REQUIREMENTS:

    1. CALCULATE EACH SECTION SCORE EXACTLY using the step-by-step method above
    2. For each section, you MUST show your calculation: "Step 1: X points, Step 2: Y points, Step 3: Z points, Step 4: W points. Total: X+Y+Z+W = FINAL_SCORE"
    3. Use the FULL range 0-100 based on actual response quality
    4. OVERALL SCORE = (PROBLEM_SOLUTION_SCORE × 0.25) + (TARGET_CUSTOMERS_SCORE × 0.25) + (COMPETITORS_SCORE × 0.20) + (REVENUE_MODEL_SCORE × 0.15) + (DIFFERENTIATION_SCORE × 0.15)

    RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 80 with no section below 70
    - Consider: Overall score 60-79 OR strong sections with some weaknesses
    - Reject: Overall score < 60 OR critical sections below 50

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
        "overall_feedback": "comprehensive encouraging feedback focusing on potential and positive aspects while providing constructive guidance",
        "key_factors": ["key positive factors and potential demonstrated with supportive market validation"],
        "next_steps": ["specific encouraging recommendations with market-informed guidance for growth"],
        "assessment_points": [
          "EXACTLY 8-10 detailed market-focused assessment points combining positive startup insights with market intelligence",
          "Each point must be 3-4 sentences emphasizing opportunities and potential with market data",
          "Include market sizes, growth rates, competitive landscape metrics, funding trends, adoption rates",
          "Frame market challenges as opportunities for strategic positioning and growth",
          "Connect startup's approach to positive industry trends and market opportunities",
          "Provide encouraging analysis of market fit and strategic potential with actionable intelligence"
        ]
      }
    }

    REMEMBER: You MUST calculate each section score step-by-step and show your calculation. Include the score_calculation field for each section showing exactly how you arrived at the final score. Keep the scoring_reason to ONE CONCISE SENTENCE only.
    `;

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for analysis...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a precise startup evaluator. You MUST calculate each section score step-by-step using the detailed metrics provided. For each section, show your calculation as "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE". Use the full scoring range (0-100) and ensure significant score variation based on actual response quality. Keep the scoring_reason to ONE CONCISE SENTENCE only. Return ONLY valid JSON without any markdown formatting.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
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
      console.error('Failed to parse OpenAI response as JSON:', parseError);
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
