
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
    You are an expert startup evaluator with LENIENT EVALUATION STANDARDS and ENCOURAGING SCORING. Your goal is to provide supportive assessment that recognizes potential and gives credit for entrepreneurial effort.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and LENIENT EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    SCORING CALCULATION FOR PROBLEM & SOLUTION (100 points total):
    Step 1: Problem Clarity & Significance (25 pts):
    - 22-25: Good problem identification with some impact awareness
    - 18-21: Adequate problem statement showing understanding
    - 14-17: Basic problem awareness with room for development
    - 10-13: Problem mentioned but needs more clarity
    - 6-9: Some problem identification attempted
    - 0-5: No clear problem identified

    Step 2: Solution Innovation & Feasibility (25 pts):
    - 22-25: Good solution approach with reasonable connection to problem
    - 18-21: Decent solution concept with feasible elements
    - 14-17: Basic solution identified with some merit
    - 10-13: Solution attempt made with potential
    - 6-9: Some solution thinking demonstrated
    - 0-5: No viable solution presented

    Step 3: Market Understanding (25 pts):
    - 22-25: Good market awareness with some insights
    - 18-21: Decent market understanding demonstrated
    - 14-17: Basic market awareness shown
    - 10-13: Some market consideration evident
    - 6-9: Minimal market awareness attempted
    - 0-5: No market understanding demonstrated

    Step 4: Technical Depth & Implementation (25 pts):
    - 22-25: Good technical thinking with implementation consideration
    - 18-21: Decent technical awareness with some planning
    - 14-17: Basic technical understanding shown
    - 10-13: Some technical consideration evident
    - 6-9: Minimal technical awareness demonstrated
    - 0-5: No technical understanding shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = PROBLEM_SOLUTION_SCORE

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    SCORING CALCULATION FOR TARGET CUSTOMERS (100 points total):
    Step 1: Customer Segmentation Precision (30 pts):
    - 25-30: Good customer identification with decent characteristics
    - 20-24: Adequate customer segmentation with some details
    - 15-19: Basic customer identification attempted
    - 10-14: Some customer consideration shown
    - 5-9: Minimal customer awareness demonstrated
    - 0-4: No clear customer identification

    Step 2: Market Size & Accessibility (25 pts):
    - 20-25: Good market understanding with acquisition thinking
    - 16-19: Decent market awareness with some strategy
    - 12-15: Basic market consideration shown
    - 8-11: Some market understanding attempted
    - 4-7: Minimal market awareness demonstrated
    - 0-3: No market understanding shown

    Step 3: Customer Pain Points & Payment Behavior (25 pts):
    - 20-25: Good pain understanding with payment consideration
    - 16-19: Decent pain awareness with some logic
    - 12-15: Basic pain identification attempted
    - 8-11: Some pain consideration shown
    - 4-7: Minimal pain awareness demonstrated
    - 0-3: No pain understanding shown

    Step 4: Customer Validation Evidence (20 pts):
    - 16-20: Good validation efforts with some evidence
    - 13-15: Decent validation attempts shown
    - 10-12: Basic validation consideration attempted
    - 7-9: Some validation thinking demonstrated
    - 4-6: Minimal validation awareness shown
    - 0-3: No validation attempted

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = TARGET_CUSTOMERS_SCORE

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    SCORING CALCULATION FOR COMPETITORS (100 points total):
    Step 1: Competitive Landscape Knowledge (30 pts):
    - 25-30: Good competitive awareness with key players identified
    - 20-24: Decent competitive understanding shown
    - 15-19: Basic competitive awareness attempted
    - 10-14: Some competitive consideration demonstrated
    - 5-9: Minimal competitive awareness shown
    - 0-4: No competitive analysis attempted

    Step 2: Differentiation Strategy (25 pts):
    - 20-25: Good differentiation thinking with some advantages
    - 16-19: Decent differentiation consideration shown
    - 12-15: Basic differentiation attempted
    - 8-11: Some differentiation thinking demonstrated
    - 4-7: Minimal differentiation awareness shown
    - 0-3: No differentiation strategy identified

    Step 3: Competitive Analysis Depth (25 pts):
    - 20-25: Good competitor understanding with insights
    - 16-19: Decent competitive analysis attempted
    - 12-15: Basic competitor consideration shown
    - 8-11: Some competitive thinking demonstrated
    - 4-7: Minimal competitive analysis attempted
    - 0-3: No competitive analysis provided

    Step 4: Market Positioning Strategy (20 pts):
    - 16-20: Good positioning thinking with strategy consideration
    - 13-15: Decent positioning awareness shown
    - 10-12: Basic positioning attempted
    - 7-9: Some positioning consideration demonstrated
    - 4-6: Minimal positioning awareness shown
    - 0-3: No positioning strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = COMPETITORS_SCORE

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    SCORING CALCULATION FOR REVENUE MODEL (100 points total):
    Step 1: Revenue Stream Clarity (25 pts):
    - 20-25: Good revenue thinking with monetization consideration
    - 16-19: Decent revenue understanding shown
    - 12-15: Basic revenue identification attempted
    - 8-11: Some revenue consideration demonstrated
    - 4-7: Minimal revenue awareness shown
    - 0-3: No revenue model identified

    Step 2: Pricing Strategy & Logic (25 pts):
    - 20-25: Good pricing consideration with some logic
    - 16-19: Decent pricing thinking demonstrated
    - 12-15: Basic pricing awareness attempted
    - 8-11: Some pricing consideration shown
    - 4-7: Minimal pricing awareness demonstrated
    - 0-3: No pricing strategy provided

    Step 3: Financial Projections & Unit Economics (25 pts):
    - 20-25: Good financial thinking with some projections
    - 16-19: Decent financial awareness demonstrated
    - 12-15: Basic financial consideration attempted
    - 8-11: Some financial thinking shown
    - 4-7: Minimal financial awareness demonstrated
    - 0-3: No financial projections provided

    Step 4: Scalability & Growth Strategy (25 pts):
    - 20-25: Good scalability thinking with growth consideration
    - 16-19: Decent growth awareness demonstrated
    - 12-15: Basic scalability consideration attempted
    - 8-11: Some growth thinking shown
    - 4-7: Minimal scalability awareness demonstrated
    - 0-3: No scalability consideration shown

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = REVENUE_MODEL_SCORE

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    SCORING CALCULATION FOR DIFFERENTIATION (100 points total):
    Step 1: Unique Value Proposition Strength (30 pts):
    - 25-30: Good unique value thinking with clear benefits
    - 20-24: Decent value proposition consideration shown
    - 15-19: Basic uniqueness attempted
    - 10-14: Some value consideration demonstrated
    - 5-9: Minimal uniqueness awareness shown
    - 0-4: No unique value proposition

    Step 2: Defensibility & Moats (25 pts):
    - 20-25: Good defensibility thinking with some protection
    - 16-19: Decent defensibility consideration shown
    - 12-15: Basic defensibility attempted
    - 8-11: Some defensibility thinking demonstrated
    - 4-7: Minimal defensibility awareness shown
    - 0-3: No defensible advantages identified

    Step 3: Technology & Innovation Edge (25 pts):
    - 20-25: Good technology thinking with some advancement
    - 16-19: Decent technology consideration shown
    - 12-15: Basic technology awareness attempted
    - 8-11: Some technology thinking demonstrated
    - 4-7: Minimal technology awareness shown
    - 0-3: No technology differentiation identified

    Step 4: Go-to-Market Advantage (20 pts):
    - 16-20: Good GTM thinking with customer consideration
    - 13-15: Decent GTM awareness demonstrated
    - 10-12: Basic GTM consideration attempted
    - 7-9: Some GTM thinking shown
    - 4-6: Minimal GTM awareness demonstrated
    - 0-3: No GTM strategy identified

    CALCULATE: Add Step 1 + Step 2 + Step 3 + Step 4 = DIFFERENTIATION_SCORE

    LENIENT SCORING REQUIREMENTS:

    1. CALCULATE EACH SECTION SCORE EXACTLY using the step-by-step method above
    2. For each section, you MUST show your calculation: "Step 1: X points, Step 2: Y points, Step 3: Z points, Step 4: W points. Total: X+Y+Z+W = FINAL_SCORE"
    3. Be GENEROUS in scoring - give credit for effort and potential
    4. OVERALL SCORE = (PROBLEM_SOLUTION_SCORE × 0.25) + (TARGET_CUSTOMERS_SCORE × 0.25) + (COMPETITORS_SCORE × 0.20) + (REVENUE_MODEL_SCORE × 0.15) + (DIFFERENTIATION_SCORE × 0.15)

    LENIENT RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 75 with no section below 60
    - Consider: Overall score 55-74 OR good sections with some development areas
    - Reject: Overall score < 55 AND multiple critical sections below 40

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

    REMEMBER: You MUST calculate each section score step-by-step and show your calculation. Include the score_calculation field for each section showing exactly how you arrived at the final score. Keep the scoring_reason to ONE CONCISE SENTENCE only. BE GENEROUS AND ENCOURAGING IN YOUR SCORING.
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
            content: 'You are a supportive startup evaluator with LENIENT evaluation standards. You MUST calculate each section score step-by-step using the generous metrics provided. For each section, show your calculation as "Step 1: X pts, Step 2: Y pts, Step 3: Z pts, Step 4: W pts. Total: FINAL_SCORE". Be GENEROUS in scoring - give credit for effort and potential. Keep the scoring_reason to ONE CONCISE SENTENCE only. Return ONLY valid JSON without any markdown formatting.'
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
