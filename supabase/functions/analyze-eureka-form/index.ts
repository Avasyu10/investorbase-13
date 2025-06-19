
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
    You are an expert startup evaluator with VARIED SCORING STANDARDS to differentiate between submissions. Your goal is to provide realistic assessment that shows clear distinctions between different quality levels.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and VARIED EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    SCORING CALCULATION FOR PROBLEM & SOLUTION (100 points total):
    Step 1: Problem Clarity & Significance (25 pts):
    - 23-25: Exceptional problem identification with compelling market data and urgency
    - 20-22: Strong problem statement with clear impact awareness
    - 16-19: Good problem identification with some market understanding
    - 12-15: Basic problem awareness but lacks depth or urgency
    - 8-11: Vague problem identification with minimal market connection
    - 4-7: Poor problem clarity, mostly assumptions
    - 0-3: No clear problem identified or completely misunderstood

    Step 2: Solution Innovation & Feasibility (25 pts):
    - 23-25: Highly innovative solution with strong technical feasibility
    - 20-22: Creative solution approach with realistic implementation plan
    - 16-19: Good solution concept with reasonable feasibility
    - 12-15: Basic solution but implementation unclear
    - 8-11: Weak solution with questionable feasibility
    - 4-7: Poor solution that doesn't address the problem well
    - 0-3: No viable solution or completely unrealistic

    Step 3: Market Understanding (25 pts):
    - 23-25: Deep market insights with data-driven analysis
    - 20-22: Strong market awareness with competitive insights
    - 16-19: Good market understanding with some research
    - 12-15: Basic market awareness but superficial
    - 8-11: Limited market understanding, mostly assumptions
    - 4-7: Poor market awareness with significant gaps
    - 0-3: No market understanding demonstrated

    Step 4: Technical Depth & Implementation (25 pts):
    - 23-25: Strong technical planning with detailed implementation strategy
    - 20-22: Good technical understanding with clear next steps
    - 16-19: Decent technical awareness with some planning
    - 12-15: Basic technical consideration but lacks depth
    - 8-11: Minimal technical understanding
    - 4-7: Poor technical awareness with unrealistic expectations
    - 0-3: No technical understanding shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = PROBLEM_SOLUTION_SCORE

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    SCORING CALCULATION FOR TARGET CUSTOMERS (100 points total):
    Step 1: Customer Segmentation Precision (30 pts):
    - 27-30: Precise, well-researched customer segments with detailed personas
    - 23-26: Good customer identification with clear characteristics
    - 18-22: Decent customer segmentation with some details
    - 13-17: Basic customer identification but lacks precision
    - 8-12: Vague customer definition with limited understanding
    - 4-7: Poor customer identification, too broad or unclear
    - 0-3: No clear customer identification

    Step 2: Market Size & Accessibility (25 pts):
    - 23-25: Strong market sizing with realistic acquisition strategy
    - 19-22: Good market understanding with clear go-to-market approach
    - 15-18: Decent market awareness with some strategy
    - 11-14: Basic market consideration but lacks detail
    - 7-10: Limited market understanding
    - 4-6: Poor market analysis with unrealistic assumptions
    - 0-3: No market understanding shown

    Step 3: Customer Pain Points & Payment Behavior (25 pts):
    - 23-25: Deep understanding of pain points with willingness-to-pay evidence
    - 19-22: Good pain understanding with logical payment reasoning
    - 15-18: Decent pain identification with some validation
    - 11-14: Basic pain consideration but superficial
    - 7-10: Limited pain understanding
    - 4-6: Poor pain analysis with weak reasoning
    - 0-3: No pain understanding shown

    Step 4: Customer Validation Evidence (20 pts):
    - 18-20: Strong validation with customer interviews and feedback
    - 15-17: Good validation efforts with some customer contact
    - 12-14: Basic validation attempts shown
    - 8-11: Minimal validation with mostly assumptions
    - 5-7: Poor validation efforts
    - 2-4: Almost no validation attempted
    - 0-1: No validation shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = TARGET_CUSTOMERS_SCORE

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    SCORING CALCULATION FOR COMPETITORS (100 points total):
    Step 1: Competitive Landscape Knowledge (30 pts):
    - 27-30: Comprehensive competitive analysis with direct and indirect competitors
    - 23-26: Strong competitive awareness with key players identified
    - 18-22: Good competitive understanding with some research
    - 13-17: Basic competitive awareness but incomplete
    - 8-12: Limited competitive understanding
    - 4-7: Poor competitive analysis with major gaps
    - 0-3: No competitive analysis or completely wrong

    Step 2: Differentiation Strategy (25 pts):
    - 23-25: Clear, compelling differentiation with sustainable advantages
    - 19-22: Strong differentiation strategy with unique positioning
    - 15-18: Good differentiation with some competitive advantages
    - 11-14: Basic differentiation but not compelling
    - 7-10: Weak differentiation strategy
    - 4-6: Poor differentiation with little uniqueness
    - 0-3: No differentiation strategy identified

    Step 3: Competitive Analysis Depth (25 pts):
    - 23-25: In-depth competitor analysis with strengths/weaknesses
    - 19-22: Good competitive insights with detailed understanding
    - 15-18: Decent competitor analysis with some insights
    - 11-14: Basic competitor consideration but shallow
    - 7-10: Limited competitive analysis
    - 4-6: Poor competitor understanding
    - 0-3: No competitive analysis provided

    Step 4: Market Positioning Strategy (20 pts):
    - 18-20: Strong positioning strategy with clear market niche
    - 15-17: Good positioning with strategic thinking
    - 12-14: Decent positioning consideration
    - 8-11: Basic positioning but unclear strategy
    - 5-7: Weak positioning awareness
    - 2-4: Poor positioning strategy
    - 0-1: No positioning strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = COMPETITORS_SCORE

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    SCORING CALCULATION FOR REVENUE MODEL (100 points total):
    Step 1: Revenue Stream Clarity (25 pts):
    - 23-25: Clear, diversified revenue streams with strong monetization logic
    - 19-22: Good revenue model with logical monetization approach
    - 15-18: Decent revenue thinking with some clarity
    - 11-14: Basic revenue identification but unclear execution
    - 7-10: Weak revenue model with limited thinking
    - 4-6: Poor revenue strategy with unrealistic assumptions
    - 0-3: No revenue model identified

    Step 2: Pricing Strategy & Logic (25 pts):
    - 23-25: Well-researched pricing with competitive analysis and value justification
    - 19-22: Good pricing strategy with logical reasoning
    - 15-18: Decent pricing consideration with some research
    - 11-14: Basic pricing but lacks market validation
    - 7-10: Weak pricing strategy
    - 4-6: Poor pricing with little justification
    - 0-3: No pricing strategy provided

    Step 3: Financial Projections & Unit Economics (25 pts):
    - 23-25: Detailed financial projections with realistic unit economics
    - 19-22: Good financial thinking with some projections
    - 15-18: Decent financial consideration with basic projections
    - 11-14: Basic financial thinking but lacks detail
    - 7-10: Weak financial projections
    - 4-6: Poor financial understanding
    - 0-3: No financial projections provided

    Step 4: Scalability & Growth Strategy (25 pts):
    - 23-25: Strong scalability plan with clear growth levers
    - 19-22: Good scalability thinking with growth strategy
    - 15-18: Decent scalability consideration
    - 11-14: Basic scalability awareness but limited planning
    - 7-10: Weak scalability understanding
    - 4-6: Poor growth strategy
    - 0-3: No scalability consideration shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = REVENUE_MODEL_SCORE

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    SCORING CALCULATION FOR DIFFERENTIATION (100 points total):
    Step 1: Unique Value Proposition Strength (30 pts):
    - 27-30: Compelling, unique value proposition with clear customer benefits
    - 23-26: Strong value proposition with good differentiation
    - 18-22: Good uniqueness with clear benefits
    - 13-17: Basic uniqueness but not compelling
    - 8-12: Weak value proposition
    - 4-7: Poor uniqueness with little value
    - 0-3: No unique value proposition

    Step 2: Defensibility & Moats (25 pts):
    - 23-25: Strong defensible advantages with multiple moats
    - 19-22: Good defensibility with some protection strategies
    - 15-18: Decent defensibility consideration
    - 11-14: Basic defensibility but weak
    - 7-10: Limited defensibility awareness
    - 4-6: Poor defensible advantages
    - 0-3: No defensible advantages identified

    Step 3: Technology & Innovation Edge (25 pts):
    - 23-25: Cutting-edge technology with significant innovation
    - 19-22: Strong technology differentiation
    - 15-18: Good technology consideration with some innovation
    - 11-14: Basic technology awareness but not innovative
    - 7-10: Limited technology differentiation
    - 4-6: Poor technology strategy
    - 0-3: No technology differentiation identified

    Step 4: Go-to-Market Advantage (20 pts):
    - 18-20: Superior go-to-market strategy with competitive advantages
    - 15-17: Strong GTM approach with clear advantages
    - 12-14: Good GTM consideration
    - 8-11: Basic GTM thinking but unremarkable
    - 5-7: Weak GTM strategy
    - 2-4: Poor GTM approach
    - 0-1: No GTM strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = DIFFERENTIATION_SCORE

    VARIED SCORING REQUIREMENTS:

    1. CALCULATE EACH SECTION SCORE EXACTLY using the step-by-step method above
    2. For each section, you MUST show your calculation: "Step 1: X points, Step 2: Y points, Step 3: Z points, Step 4: W points. Total: X+Y+Z+W = FINAL_SCORE"
    3. Be REALISTIC in scoring - differentiate clearly between quality levels
    4. OVERALL SCORE = (PROBLEM_SOLUTION_SCORE × 0.25) + (TARGET_CUSTOMERS_SCORE × 0.25) + (COMPETITORS_SCORE × 0.20) + (REVENUE_MODEL_SCORE × 0.15) + (DIFFERENTIATION_SCORE × 0.15)

    REALISTIC RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 80 AND no section below 70
    - Consider: Overall score 60-79 OR good potential with development areas
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

    REMEMBER: You MUST calculate each section score step-by-step and show your calculation. Include the score_calculation field for each section showing exactly how you arrived at the final score. Keep the scoring_reason to ONE CONCISE SENTENCE only. BE REALISTIC AND VARIED IN YOUR SCORING to show clear quality differences.
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
                text: `You are a realistic startup evaluator with VARIED scoring standards to differentiate between submissions. You MUST calculate each section score step-by-step using the detailed metrics provided. For each section, show your calculation as "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE". Be REALISTIC in scoring - show clear distinctions between different quality levels. Keep the scoring_reason to ONE CONCISE SENTENCE only. Return ONLY valid JSON without any markdown formatting.\n\n${analysisPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
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
