
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
    You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and Specific Metrics for Evaluation:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Problem Clarity (30 pts): Is it real, urgent, and well-articulated with specific details?
    - Current Alternatives (30 pts): Are existing coping methods explained clearly with depth?
    - Solution Fit (30 pts): Is the solution directly tackling the core pain point with thoughtful reasoning?
    
    Score harshly if: Problem is vague or generic, no insight into how people cope, unclear connection between problem and solution, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Clear, urgent pain point + solid understanding of alternatives + compelling solution match + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Customer Definition (35 pts): Are the segments specific and realistic with detailed descriptions?
    - Use Case Relevance (35 pts): Does the product clearly serve these users with specific examples?
    - Depth of Understanding (30 pts): Shows behavioral, demographic, or need-based insight with evidence?
    
    Score harshly if: Describes "everyone" or is overly broad, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Defined personas, nuanced insights, matched offering + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Competitor Awareness (35 pts): Are both direct and indirect players mentioned with specific names and details?
    - Comparison Clarity (35 pts): Is differentiation from competitors clear with specific comparisons?
    - Strategic Positioning (30 pts): Do they show where they fit in the landscape with thoughtful analysis?
    
    Score harshly if: Misses obvious competitors or gives vague comparisons, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Deep landscape awareness and sharp positioning + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Monetization Clarity (30 pts): Is revenue generation clearly explained with specific mechanisms?
    - Cost/Revenue Drivers (35 pts): Are cost factors and revenue influencers identified with details?
    - Scalability & Growth (35 pts): Is there a future roadmap for expansion with concrete plans?
    
    Score harshly if: No revenue clarity or hand-wavy growth claims, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Structured, feasible model + strong growth potential + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - USP Clarity (30 pts): Clear, strong differentiator from others with specific advantages?
    - Customer Pull Strategy (35 pts): Effective tactics to attract and retain users with detailed plans?
    - IP or Moat (35 pts): Any defensibility—tech, brand, data, or network effects with specifics?
    
    Score harshly if: No meaningful edge, or vague marketing, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Compelling USP + solid GTM + proprietary advantage + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    CRITICAL SCORING GUIDELINES - BE EXTREMELY HARSH ON POOR ANSWERS:

    ANSWER LENGTH AND QUALITY REQUIREMENTS (THESE ARE HARD LIMITS):
    - ONE-WORD ANSWERS OR UNDER 5 WORDS: Score 5-15 MAXIMUM (regardless of market potential)
    - UNDER 10 WORDS: Score 5-20 MAXIMUM (regardless of market potential)
    - UNDER 20 WORDS: Score 10-30 MAXIMUM (regardless of market potential)
    - UNDER 50 WORDS: Score 15-45 MAXIMUM (rarely above 40)
    - 50-100 WORDS: Can score up to 60-70 if high quality
    - 100+ WORDS with specifics: Can score 70-85
    - 150+ WORDS with comprehensive analysis: Can score 80-95
    - 200+ WORDS with exceptional depth: Can score 90-100

    ANSWER QUALITY IS THE PRIMARY FACTOR - Market data should only be used as context, NOT to inflate scores for poor answers.

    90-100: Exceptional responses with deep insights, clear evidence, comprehensive understanding, DETAILED RESPONSES (150+ words with specific examples, data, and thorough explanations)
    80-89: Strong responses with good evidence and understanding, minor gaps, GOOD DETAIL (100-150 words with some specifics)
    70-79: Adequate responses with some evidence, moderate understanding, MODERATE DETAIL (50-100 words)
    60-69: Weak responses with limited evidence, significant gaps, BRIEF RESPONSES (20-50 words)
    40-59: Poor responses with minimal substance, major deficiencies, VERY SHORT (10-20 words)
    20-39: Very poor responses, largely inadequate or missing key elements, EXTREMELY SHORT (5-10 words)
    1-19: Extremely poor or non-responses, ONE-WORD ANSWERS OR MEANINGLESS TEXT (under 5 words)

    MARKET INTEGRATION REQUIREMENT:
    For each section, integrate relevant market data including: market size figures, growth rates, customer acquisition costs, competitive landscape data, industry benchmarks, success rates, and financial metrics. Balance response quality assessment with market context. However, POOR ANSWER QUALITY CANNOT BE COMPENSATED BY GOOD MARKET DATA.

    For ASSESSMENT POINTS (8-10 points required):
    Each point MUST be detailed (3-4 sentences each) and contain specific numbers: market sizes ($X billion), growth rates (X% CAGR), customer metrics ($X CAC), competitive data, success rates (X%), and industry benchmarks, seamlessly integrated with response evaluation. Each assessment point should provide substantial market intelligence that connects startup positioning with industry realities, competitive dynamics, and growth opportunities.

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
        "target_customers": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "competitors": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "revenue_model": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "differentiation": {
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
        "assessment_points": [
          "EXACTLY 8-10 detailed market-focused assessment points that combine insights across all sections",
          "Each point must be 3-4 sentences long and prioritize market data and numbers above all else",
          "Include specific market sizes (e.g., $X billion TAM), growth rates (X% CAGR), customer acquisition costs ($X CAC), competitive landscape metrics, funding trends, adoption rates, etc.",
          "Weave in insights from the startup's responses to show market positioning and strategic implications",
          "Focus on quantifiable market opportunities, risks, and benchmarks with actionable intelligence",
          "Connect startup's approach to broader industry trends, competitive dynamics, and market timing factors",
          "Provide detailed analysis of how their solution fits within current market conditions and future projections",
          "Examples: 'Operating in the $47B EdTech market growing at 16.3% CAGR, this startup faces typical customer acquisition challenges where the average CAC of $89 affects 73% of similar companies. However, their university partnership approach could potentially reduce acquisition costs by 40% based on sector data, while competing against established players like Coursera ($2.9B market cap) and emerging AI-powered platforms that have collectively raised $1.2B in the last 18 months. The regulatory environment shows favorable trends with 67% of educational institutions increasing digital adoption budgets by an average of 23% annually.'",
          "Prioritize hard numbers, market intelligence, competitive analysis, and strategic positioning over qualitative assessments",
          "Each assessment point should provide substantial business intelligence that investors can act upon"
        ]
      }
    }

    CRITICAL REQUIREMENTS:
    1. ANSWER QUALITY IS THE PRIMARY SCORING FACTOR - poor answers cannot be saved by market potential
    2. CREATE SIGNIFICANT SCORE DIFFERENCES - excellent detailed responses (80-100), poor short responses (5-30)
    3. Use the exact metrics provided for each question in your evaluation
    4. HEAVILY PENALIZE SHORT, SUPERFICIAL ANSWERS - follow the strict word count limits above
    5. REWARD DETAILED, THOUGHTFUL RESPONSES - comprehensive answers with specifics should score 80-100
    6. ASSESSMENT POINTS: Each of the 8-10 points must be heavily weighted toward market data, numbers, and quantifiable metrics with 3-4 sentences each
    7. Focus weaknesses ONLY on market data challenges and industry risks - NOT response quality or form gaps
    8. Provide exactly 4-5 strengths and 4-5 weaknesses per section
    9. All scores must be 1-100 scale
    10. Return only valid JSON without markdown formatting
    11. MOST IMPORTANT: Poor answer quality (short, vague, one-word answers) CANNOT be compensated by good market analysis
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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup evaluator. Provide thorough, constructive analysis in valid JSON format. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. BE EXTREMELY HARSH on poor answer quality - one-word or very short answers should receive very low scores (5-20 maximum) regardless of market potential.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
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

      // Create section details (strengths and weaknesses)
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
          
          // Add improvements (weaknesses)
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
