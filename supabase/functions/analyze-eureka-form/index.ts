
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
    You are an expert startup evaluator with BALANCED AND FAIR SCORING STANDARDS. Your goal is to create GOOD SCORE VARIATION between submissions while being fair to realistic startup applications, ranging from moderate scores (45-65) for basic applications to high scores (75-90) for strong ones. Most good submissions should fall in the 55-75 range.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and BALANCED EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    SCORING CALCULATION FOR PROBLEM & SOLUTION (100 points total) - BE FAIR BUT DISCERNING:
    Step 1: Problem Clarity & Significance (25 pts):
    - 22-25: Exceptional problem with strong market evidence and urgency
    - 18-21: Clear, well-defined problem with good market validation
    - 14-17: Solid problem identification with reasonable evidence
    - 10-13: Basic problem awareness with some validation
    - 6-9: Unclear problem definition with limited evidence
    - 3-5: Poor problem identification with weak justification
    - 0-2: No clear problem identified

    Step 2: Solution Innovation & Feasibility (25 pts):
    - 22-25: Highly innovative and clearly feasible solution
    - 18-21: Good innovation with realistic implementation plan
    - 14-17: Solid solution approach with reasonable feasibility
    - 10-13: Basic solution with unclear implementation
    - 6-9: Weak solution with questionable viability
    - 3-5: Poor solution that barely addresses problem
    - 0-2: No viable solution presented

    Step 3: Market Understanding (25 pts):
    - 22-25: Deep market expertise with comprehensive analysis
    - 18-21: Strong market research with good insights
    - 14-17: Good market awareness with adequate research
    - 10-13: Basic market knowledge with some gaps
    - 6-9: Limited market understanding
    - 3-5: Poor market awareness
    - 0-2: No demonstrated market understanding

    Step 4: Technical Depth & Implementation (25 pts):
    - 22-25: Sophisticated technical strategy with detailed planning
    - 18-21: Strong technical approach with clear roadmap
    - 14-17: Good technical consideration with reasonable planning
    - 10-13: Basic technical awareness with limited depth
    - 6-9: Minimal technical understanding
    - 3-5: Poor technical strategy
    - 0-2: No technical understanding shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = PROBLEM_SOLUTION_SCORE

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    SCORING CALCULATION FOR TARGET CUSTOMERS (100 points total) - BE FAIR BUT DISCERNING:
    Step 1: Customer Segmentation Precision (30 pts):
    - 26-30: Very precise segments with detailed buyer personas
    - 21-25: Well-defined customer segments with clear characteristics
    - 16-20: Good customer identification with reasonable specificity
    - 11-15: Basic segmentation with adequate definition
    - 6-10: Vague customer definition but some targeting
    - 3-5: Poor targeting that's too broad
    - 0-2: No clear customer identification

    Step 2: Market Size & Accessibility (25 pts):
    - 22-25: Strong market analysis with realistic strategy
    - 18-21: Good market understanding with clear approach
    - 14-17: Decent market consideration with basic strategy
    - 10-13: Basic market awareness with limited strategy
    - 6-9: Poor market analysis with weak assumptions
    - 3-5: Very limited market understanding
    - 0-2: No market sizing or unrealistic expectations

    Step 3: Customer Pain Points & Payment Behavior (25 pts):
    - 22-25: Deep pain analysis with strong willingness-to-pay logic
    - 18-21: Good pain understanding with reasonable payment logic
    - 14-17: Solid pain identification with basic validation
    - 10-13: Basic pain awareness with some reasoning
    - 6-9: Limited pain understanding
    - 3-5: Poor pain analysis
    - 0-2: No pain understanding demonstrated

    Step 4: Customer Validation Evidence (20 pts):
    - 17-20: Strong customer validation with evidence
    - 14-16: Good validation efforts with some feedback
    - 11-13: Basic validation attempts with limited evidence
    - 7-10: Minimal validation with mostly assumptions
    - 4-6: Poor validation efforts
    - 2-3: Very little validation
    - 0-1: No validation shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = TARGET_CUSTOMERS_SCORE

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    SCORING CALCULATION FOR COMPETITORS (100 points total) - BE FAIR BUT DISCERNING:
    Step 1: Competitive Landscape Knowledge (30 pts):
    - 26-30: Comprehensive competitive analysis with deep insights
    - 21-25: Strong competitive research with key players identified
    - 16-20: Good competitive understanding with reasonable analysis
    - 11-15: Basic competitive awareness with adequate research
    - 6-10: Limited competitive knowledge with some gaps
    - 3-5: Poor competitive analysis
    - 0-2: No competitive analysis

    Step 2: Differentiation Strategy (25 pts):
    - 22-25: Strong unique positioning with clear advantages
    - 18-21: Good differentiation with solid value proposition
    - 14-17: Reasonable differentiation with some uniqueness
    - 10-13: Basic differentiation but not particularly strong
    - 6-9: Weak differentiation with little uniqueness
    - 3-5: Poor positioning with minimal advantage
    - 0-2: No differentiation strategy

    Step 3: Competitive Analysis Depth (25 pts):
    - 22-25: In-depth analysis with strong competitive intelligence
    - 18-21: Good competitive insights with solid understanding
    - 14-17: Decent analysis with reasonable competitive knowledge
    - 10-13: Basic competitor consideration with surface analysis
    - 6-9: Limited competitive research
    - 3-5: Poor competitor understanding
    - 0-2: No competitive analysis

    Step 4: Market Positioning Strategy (20 pts):
    - 17-20: Clear positioning strategy with good market approach
    - 14-16: Solid positioning with reasonable strategy
    - 11-13: Good positioning consideration with basic strategy
    - 7-10: Basic positioning with limited strategic thinking
    - 4-6: Weak positioning strategy
    - 2-3: Poor positioning with unclear direction
    - 0-1: No positioning strategy

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = COMPETITORS_SCORE

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    SCORING CALCULATION FOR REVENUE MODEL (100 points total) - BE FAIR BUT DISCERNING:
    Step 1: Revenue Stream Clarity (25 pts):
    - 22-25: Clear revenue model with multiple streams and good logic
    - 18-21: Solid revenue model with logical approach
    - 14-17: Good revenue thinking with reasonable clarity
    - 10-13: Basic revenue identification with adequate planning
    - 6-9: Weak revenue model with limited thinking
    - 3-5: Poor revenue strategy with unclear approach
    - 0-2: No revenue model presented

    Step 2: Pricing Strategy & Logic (25 pts):
    - 22-25: Well-researched pricing with strong market justification
    - 18-21: Good pricing strategy with reasonable research
    - 14-17: Solid pricing consideration with basic validation
    - 10-13: Basic pricing with some market consideration
    - 6-9: Weak pricing strategy with limited justification
    - 3-5: Poor pricing with little logic
    - 0-2: No pricing strategy

    Step 3: Financial Projections & Unit Economics (25 pts):
    - 22-25: Solid financial projections with reasonable assumptions
    - 18-21: Good financial thinking with basic modeling
    - 14-17: Decent financial consideration with simple projections
    - 10-13: Basic financial awareness with limited projections
    - 6-9: Poor financial understanding
    - 3-5: Very weak financial projections
    - 0-2: No financial projections

    Step 4: Scalability & Growth Strategy (25 pts):
    - 22-25: Strong scalability plan with clear growth strategy
    - 18-21: Good scalability thinking with reasonable strategy
    - 14-17: Solid scalability consideration with basic planning
    - 10-13: Basic scalability awareness with limited planning
    - 6-9: Weak scalability understanding
    - 3-5: Poor growth planning
    - 0-2: No scalability consideration

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = REVENUE_MODEL_SCORE

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    SCORING CALCULATION FOR DIFFERENTIATION (100 points total) - BE FAIR BUT DISCERNING:
    Step 1: Unique Value Proposition Strength (30 pts):
    - 26-30: Strong value proposition with clear benefits
    - 21-25: Good unique value with solid customer benefits
    - 16-20: Reasonable uniqueness with clear benefits
    - 11-15: Basic uniqueness with some compelling aspects
    - 6-10: Weak value proposition with limited differentiation
    - 3-5: Poor uniqueness with little value
    - 0-2: No unique value proposition

    Step 2: Defensibility & Moats (25 pts):
    - 22-25: Good defensible advantages with some barriers
    - 18-21: Reasonable defensibility with basic protection
    - 14-17: Decent defensibility with some competitive protection
    - 10-13: Basic defensibility with limited barriers
    - 6-9: Weak defensive advantages
    - 3-5: Poor defensibility with no real barriers
    - 0-2: No defensible advantages

    Step 3: Technology & Innovation Edge (25 pts):
    - 22-25: Strong technology differentiation with innovation
    - 18-21: Good technology approach with some innovation
    - 14-17: Decent technology with reasonable innovation
    - 10-13: Basic technology with limited innovation
    - 6-9: Poor technology strategy with little innovation
    - 3-5: Very weak technology approach
    - 0-2: No technology differentiation

    Step 4: Go-to-Market Advantage (20 pts):
    - 17-20: Strong GTM strategy with clear advantages
    - 14-16: Good GTM approach with some advantages
    - 11-13: Decent GTM consideration with basic advantages
    - 7-10: Basic GTM thinking with limited advantages
    - 4-6: Weak GTM strategy
    - 2-3: Poor GTM approach
    - 0-1: No GTM strategy

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = DIFFERENTIATION_SCORE

    BALANCED SCORING REQUIREMENTS FOR GOOD VARIATION:

    1. CALCULATE EACH SECTION SCORE EXACTLY using the step-by-step method above
    2. For each section, you MUST show your calculation: "Step 1: X points, Step 2: Y points, Step 3: Z points, Step 4: W points. Total: X+Y+Z+W = FINAL_SCORE"
    3. BE FAIR BUT DISCERNING - Most good submissions should score in the 55-75 range with exceptional ones reaching 80-90
    4. CREATE GOOD VARIATION - Aim for meaningful differences between weak and strong submissions while being fair
    5. OVERALL SCORE = (PROBLEM_SOLUTION_SCORE × 0.25) + (TARGET_CUSTOMERS_SCORE × 0.25) + (COMPETITORS_SCORE × 0.20) + (REVENUE_MODEL_SCORE × 0.15) + (DIFFERENTIATION_SCORE × 0.15)

    BALANCED RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 80 AND no section below 70 (for truly exceptional submissions)
    - Consider: Overall score 60-79 OR shows good potential with some strong areas
    - Reject: Overall score < 60 OR multiple critical sections below 50

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

    REMEMBER: You MUST calculate each section score step-by-step and show your calculation. BE FAIR BUT DISCERNING to create good score variation (45-90 range). Keep the scoring_reason to ONE CONCISE SENTENCE only. Most good submissions should score 55-75 with exceptional ones reaching 80-90.
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
                text: `You are a FAIR BUT DISCERNING startup evaluator with BALANCED SCORING STANDARDS. Your goal is to create good score variation that ranges from 45-90 with most good submissions falling in 55-75 range. You MUST calculate each section score step-by-step using the detailed metrics provided. For each section, show your calculation as "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE". BE FAIR to realistic startup applications while maintaining meaningful distinctions between quality levels. Good submissions should score well (60-80) with only exceptional ones reaching 85+. Keep the scoring_reason to ONE CONCISE SENTENCE only. Return ONLY valid JSON without any markdown formatting.\n\n${analysisPrompt}`
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
