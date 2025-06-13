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

    // Get submission and check if analysis is already completed
    console.log('Fetching submission for analysis...');
    const { data: existingSubmission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !existingSubmission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission for analysis:', {
      id: existingSubmission.id,
      company_name: existingSubmission.company_name,
      submitter_email: existingSubmission.submitter_email,
      form_slug: existingSubmission.form_slug,
      existing_company_id: existingSubmission.company_id,
      analysis_status: existingSubmission.analysis_status,
      founder_linkedin_urls: existingSubmission.founder_linkedin_urls,
      company_linkedin_url: existingSubmission.company_linkedin_url,
      user_id: existingSubmission.user_id
    });

    // Check if analysis is already completed and company exists
    if (existingSubmission.analysis_status === 'completed' && existingSubmission.company_id) {
      console.log('Analysis already completed, returning existing result');
      return new Response(
        JSON.stringify({ 
          success: true,
          submissionId,
          analysisResult: existingSubmission.analysis_result,
          companyId: existingSubmission.company_id,
          isNewCompany: false,
          message: 'Analysis already completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Improved locking mechanism with better error responses
    const lockTimestamp = new Date().toISOString();
    
    // Try to update status to processing with timestamp-based locking
    console.log('Attempting to acquire lock for submission analysis...');
    const { data: lockResult, error: lockError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: lockTimestamp
      })
      .eq('id', submissionId)
      .in('analysis_status', ['pending', 'failed']) // Only allow from these states
      .select()
      .maybeSingle();

    if (lockError) {
      console.error('Error acquiring lock:', lockError);
      throw new Error('Failed to start analysis - please try again');
    }

    if (!lockResult) {
      console.log('Could not acquire lock - submission is already being processed or completed');
      
      // Return a more specific response for concurrent processing
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'This submission is already being analyzed or has been completed. Please wait or refresh the page.',
          submissionId,
          status: 'concurrent_processing',
          code: 'ALREADY_PROCESSING'
        }),
        {
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Successfully acquired lock for submission analysis');

    // Determine the effective user ID for company creation
    // Priority: 1) User from submission (if IIT Bombay), 2) Form owner, 3) Current user
    let effectiveUserId = existingSubmission.user_id; // This will be set for IIT Bombay users

    // If no user_id in submission, try to get form owner
    if (!effectiveUserId && existingSubmission.form_slug) {
      const { data: formData, error: formError } = await supabase
        .from('public_submission_forms')
        .select('user_id')
        .eq('form_slug', existingSubmission.form_slug)
        .single();

      if (!formError && formData) {
        effectiveUserId = formData.user_id;
        console.log('Using form owner as effective user:', effectiveUserId);
      }
    }

    // Fallback to current user if still no effective user
    if (!effectiveUserId) {
      effectiveUserId = currentUserId;
    }

    console.log('Using effective user ID for company creation:', effectiveUserId);

    // Scrape Company LinkedIn URL if provided
    let companyLinkedInContent = '';
    let hasCompanyLinkedInData = false;
    
    if (existingSubmission.company_linkedin_url) {
      console.log('Found Company LinkedIn URL to scrape:', existingSubmission.company_linkedin_url);
      
      try {
        // Call the scrape-linkedin function for company LinkedIn - use reportId instead of companyId
        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-linkedin', {
          body: { 
            linkedInUrls: [existingSubmission.company_linkedin_url],
            reportId: submissionId // Use reportId for identification instead of companyId
          }
        });

        if (scrapeError) {
          console.error('Company LinkedIn scraping error (non-fatal):', scrapeError);
          companyLinkedInContent = '\n\nNote: Company LinkedIn profile scraping encountered issues, but continuing with analysis.\n';
          companyLinkedInContent += `Scraping error: ${scrapeError.message || 'Unknown error'}\n`;
        } else if (scrapeResult?.success && scrapeResult?.profiles && scrapeResult.profiles.length > 0) {
          console.log('Company LinkedIn profile scraped successfully');
          hasCompanyLinkedInData = true;
          
          const companyProfile = scrapeResult.profiles[0];
          companyLinkedInContent = '\n\nCOMPANY LINKEDIN PROFILE ANALYSIS:\n\n';
          companyLinkedInContent += `Company LinkedIn URL: ${companyProfile.url}\n\n`;
          companyLinkedInContent += `Company Information:\n${companyProfile.content}\n\n`;
          companyLinkedInContent += "--- End of Company Profile ---\n\n";
          
          companyLinkedInContent += "\nThis Company LinkedIn profile data should be analyzed for:\n";
          companyLinkedInContent += "- Company size and growth trajectory\n";
          companyLinkedInContent += "- Business model and value proposition\n";
          companyLinkedInContent += "- Market presence and credibility\n";
          companyLinkedInContent += "- Industry positioning and competitive advantages\n";
          companyLinkedInContent += "- Recent company updates and milestones\n";
          companyLinkedInContent += "- Employee count and team growth\n\n";
        } else {
          console.log('Company LinkedIn scraping returned no profiles');
          companyLinkedInContent = '\n\nNote: Company LinkedIn profile data was not available for analysis.\n';
        }
      } catch (scrapeError) {
        console.error('Company LinkedIn scraping failed (non-fatal):', scrapeError);
        companyLinkedInContent = '\n\nNote: Company LinkedIn profile scraping failed, but continuing with analysis.\n';
        companyLinkedInContent += `Error details: ${scrapeError.message || 'Unknown error'}\n`;
      }
    }

    // Scrape LinkedIn profiles if provided - with improved error handling
    let linkedInContent = '';
    let hasLinkedInData = false;
    let founderProfiles = [];
    
    if (existingSubmission.founder_linkedin_urls && existingSubmission.founder_linkedin_urls.length > 0) {
      console.log('Found LinkedIn URLs to scrape:', existingSubmission.founder_linkedin_urls);
      
      try {
        // Call the scrape-linkedin function with better error handling - use reportId instead of companyId
        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-linkedin', {
          body: { 
            linkedInUrls: existingSubmission.founder_linkedin_urls,
            reportId: submissionId // Use reportId for identification instead of companyId
          }
        });

        if (scrapeError) {
          console.error('LinkedIn scraping error (non-fatal):', scrapeError);
          linkedInContent = '\n\nNote: LinkedIn profile scraping encountered issues, but continuing with analysis.\n';
          linkedInContent += `Scraping error: ${scrapeError.message || 'Unknown error'}\n`;
        } else if (scrapeResult?.success && scrapeResult?.profiles) {
          console.log('LinkedIn profiles scraped successfully:', scrapeResult.profiles.length);
          hasLinkedInData = true;
          founderProfiles = scrapeResult.profiles;
          
          linkedInContent = '\n\nFOUNDER LINKEDIN PROFILES ANALYSIS:\n\n';
          scrapeResult.profiles.forEach((profile: any, index: number) => {
            linkedInContent += `=== FOUNDER ${index + 1} PROFILE ===\n`;
            linkedInContent += `LinkedIn URL: ${profile.url}\n\n`;
            linkedInContent += `Professional Background:\n${profile.content}\n\n`;
            linkedInContent += "--- End of Profile ---\n\n";
          });
          
          linkedInContent += "\nThis LinkedIn profile data should be analyzed for:\n";
          linkedInContent += "- Relevant industry experience\n";
          linkedInContent += "- Leadership roles and achievements\n";
          linkedInContent += "- Educational background\n";
          linkedInContent += "- Skills relevant to the business\n";
          linkedInContent += "- Network and connections quality\n";
          linkedInContent += "- Previous startup or entrepreneurial experience\n\n";
        } else {
          console.log('LinkedIn scraping returned no profiles');
          linkedInContent = '\n\nNote: LinkedIn profile data was not available for analysis.\n';
        }
      } catch (scrapeError) {
        console.error('LinkedIn scraping failed (non-fatal):', scrapeError);
        linkedInContent = '\n\nNote: LinkedIn profile scraping failed, but continuing with analysis.\n';
        linkedInContent += `Error details: ${scrapeError.message || 'Unknown error'}\n`;
      }
    }

    // Create team section instructions based on LinkedIn data availability
    const teamSectionInstructions = hasLinkedInData ? `
    4. TEAM STRENGTH: "${existingSubmission.question_4 || 'Not provided'}"
    ${linkedInContent}
    
    SPECIAL INSTRUCTIONS FOR TEAM SECTION WHEN LINKEDIN DATA IS AVAILABLE:
    - In the STRENGTHS section, format founder information as: "Founder/Co-founder [Name]: [2-3 most important points about their background, experience, and relevance to the business]"
    - Extract founder names from the LinkedIn profiles and highlight their most relevant experience
    - Include additional market-validated strengths beyond founder profiles
    - Focus on domain expertise, track record, and complementary skills
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Founder-Problem Fit (30-35 points): Domain expertise or lived experience with the problem?
    - Complementarity of Skills (30-35 points): Tech + business + ops coverage?
    - Execution History (30-35 points): Track record of building, selling, or scaling?
    
    IMPORTANT: Use the LinkedIn profile data above to assess team strength more accurately. Consider the professional backgrounds, experience, education, and achievements shown in the LinkedIn profiles when evaluating founder-problem fit and execution history.
    
    Score harshly if: No domain experience, skill gaps, no execution track record
    Score highly if: Deep domain expertise, complementary skills, proven execution` : `
    4. TEAM STRENGTH: "${existingSubmission.question_4 || 'Not provided'}"
    
    SPECIAL INSTRUCTIONS FOR TEAM SECTION WHEN NO LINKEDIN DATA IS AVAILABLE:
    - Focus on analyzing the written response about team background
    - Include market data and industry benchmarks related to team composition
    - Evaluate based on the information provided in the application response
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Founder-Problem Fit (30-35 points): Domain expertise or lived experience with the problem?
    - Complementarity of Skills (30-35 points): Tech + business + ops coverage?
    - Execution History (30-35 points): Track record of building, selling, or scaling?
    
    Score harshly if: No domain experience, skill gaps, no execution track record
    Score highly if: Deep domain expertise, complementary skills, proven execution`;

    // Enhanced analysis prompt with specific metrics-based scoring and market-focused weaknesses
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Your task is to provide a comprehensive and HIGHLY DISCRIMINATIVE analysis that clearly distinguishes between excellent and poor responses. Use the specific metrics provided for each question to score accurately.

    CRITICAL SCORING INSTRUCTION: You MUST create significant score differences between good and poor responses. Excellent answers should score 80-100, average answers 50-70, and poor/incomplete answers 10-40. DO NOT give similar scores to vastly different quality responses.

    Company Information:
    - Company Name: ${existingSubmission.company_name || 'Not provided'}
    - Registration Type: ${existingSubmission.company_registration_type || 'Not provided'}
    - Company Type: ${existingSubmission.company_type || 'Not provided'}
    - Executive Summary: ${existingSubmission.executive_summary || 'Not provided'}
    - Company LinkedIn URL: ${existingSubmission.company_linkedin_url || 'Not provided'}
    - Submitter Email: ${existingSubmission.submitter_email || 'Not provided'}

    ${hasCompanyLinkedInData ? companyLinkedInContent : ''}

    Application Responses and Specific Metrics for Evaluation:

    1. PROBLEM & TIMING: "${existingSubmission.question_1 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Clarity of Problem Definition (20-30 points): Is it a real, urgent pain point with clear articulation?
    - Market Timing Justification (20-30 points): Evidence of market shift, tech readiness, policy changes, etc.
    - Insight Depth (20-30 points): Customer anecdotes, data, firsthand experience provided
    
    Score harshly if: Vague problem description, no timing evidence, lacks personal insight
    Score highly if: Crystal clear pain point, strong timing evidence, rich customer insights

    2. CUSTOMER DISCOVERY: "${existingSubmission.question_2 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Customer Clarity (25-35 points): Can they describe personas/segments with precision?
    - Validation Effort (25-35 points): Have they spoken to customers, secured pilots, gathered feedback?
    - GTMP Realism (25-35 points): Is acquisition strategy practical and scalable?
    
    Score harshly if: Generic customer descriptions, no validation efforts, unrealistic GTM
    Score highly if: Detailed customer personas, extensive validation, practical GTM strategy

    3. COMPETITIVE ADVANTAGE: "${existingSubmission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Differentiation (30-35 points): Clearly stated advantages vs existing solutions?
    - Defensibility (30-35 points): Hard to replicate—tech IP, data, partnerships, network effects?
    - Strategic Awareness (30-35 points): Aware of and positioned against incumbents?
    
    Score harshly if: No clear differentiation, easily replicable, unaware of competition
    Score highly if: Strong unique value prop, defensible moats, competitive intelligence

    ${teamSectionInstructions}

    5. EXECUTION PLAN: "${existingSubmission.question_5 || 'Not provided'}"
    
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
    ${hasCompanyLinkedInData ? '\n\nIMPORTANT: Use the Company LinkedIn profile data provided above to enhance your analysis with additional company context, market positioning, and credibility assessment.\n' : ''}

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
    8. ${hasCompanyLinkedInData ? 'INCORPORATE Company LinkedIn profile insights throughout the analysis for enhanced company context and market positioning assessment' : 'Continue with analysis based on available information'}
    9. Return only valid JSON without markdown formatting
    `;

    // Call OpenAI API with better error handling
    console.log('Calling OpenAI API for enhanced metrics-based analysis with LinkedIn data...');
    let openaiResponse;
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-11-20',
          messages: [
            {
              role: 'system',
              content: `You are an expert startup evaluator for IIT Bombay who uses specific metrics for highly discriminative scoring. You MUST create significant score differences between good and poor responses (excellent: 80-100, poor: 10-40). Use the exact metrics provided for each question. Generate exactly 6-7 assessment points with multiple market numbers in each. Provide exactly 4-5 strengths and 4-5 weaknesses per section. Focus weaknesses ONLY on market data challenges and industry risks - NOT response quality or what should have been included in the form. ${hasLinkedInData ? 'When LinkedIn profile data is provided, incorporate those insights into the team strength analysis and format founder information in strengths as: "Founder/Co-founder [Name]: [key points]"' : 'When no LinkedIn data is available, analyze team strength based on written response and market data.'} ${hasCompanyLinkedInData ? 'When Company LinkedIn data is provided, incorporate those insights throughout the analysis for enhanced company context and market positioning.' : ''} Return only valid JSON without markdown formatting.`
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4500,
        }),
      });
    } catch (fetchError) {
      console.error('Failed to call OpenAI API:', fetchError);
      
      // Reset status on error
      await supabase
        .from('barc_form_submissions')
        .update({ analysis_status: 'failed', analysis_error: `OpenAI API error: ${fetchError.message}` })
        .eq('id', submissionId);
      
      throw new Error(`Failed to connect to OpenAI API: ${fetchError.message}`);
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Reset status on error
      await supabase
        .from('barc_form_submissions')
        .update({ analysis_status: 'failed', analysis_error: `OpenAI API error: ${openaiResponse.status}` })
        .eq('id', submissionId);
      
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI response received, parsing...');

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      await supabase
        .from('barc_form_submissions')
        .update({ analysis_status: 'failed', analysis_error: 'Invalid OpenAI response structure' })
        .eq('id', submissionId);
      
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
      
      await supabase
        .from('barc_form_submissions')
        .update({ analysis_status: 'failed', analysis_error: 'Analysis response was not valid JSON' })
        .eq('id', submissionId);
      
      throw new Error('Analysis response was not valid JSON');
    }

    // Ensure the overall score is within the 1-100 range
    if (analysisResult.overall_score > 100) {
      console.log('Normalizing score from', analysisResult.overall_score, 'to 100-point scale');
      analysisResult.overall_score = Math.min(analysisResult.overall_score, 100);
    }

    // COMPANY CREATION/UPDATE LOGIC - PREVENT DUPLICATES
    let companyId = existingSubmission.company_id; // Use the company ID we found earlier
    let isNewCompany = false;

    if (effectiveUserId) {
      if (companyId) {
        // UPDATE EXISTING COMPANY
        console.log('Updating existing company with ID:', companyId);
        
        const companyInfo = analysisResult.company_info || {};
        
        const { error: companyUpdateError } = await supabase
          .from('companies')
          .update({
            name: existingSubmission.company_name,
            overall_score: Number(analysisResult.overall_score) || 0,
            assessment_points: analysisResult.summary?.assessment_points || [],
            source: 'barc_form'
          })
          .eq('id', companyId);

        if (companyUpdateError) {
          console.error('Failed to update company:', companyUpdateError);
        } else {
          console.log('Successfully updated existing company:', companyId);
        }

        // Update company details
        const { error: detailsUpdateError } = await supabase
          .from('company_details')
          .upsert({
            company_id: companyId,
            industry: companyInfo.industry || null,
            stage: companyInfo.stage || null,
            introduction: companyInfo.introduction || null,
            status: 'New'
          });

        if (detailsUpdateError) {
          console.error('Failed to update company details:', detailsUpdateError);
        }

      } else {
        // CREATE NEW COMPANY ONLY IF NONE EXISTS
        console.log('Creating NEW company for analyzed submission...');
        isNewCompany = true;
        
        const companyInfo = analysisResult.company_info || {};
        
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: existingSubmission.company_name,
            overall_score: Number(analysisResult.overall_score) || 0,
            user_id: effectiveUserId,
            source: 'barc_form',
            assessment_points: analysisResult.summary?.assessment_points || []
          })
          .select()
          .single();

        if (companyError || !company) {
          console.error('Failed to create company:', companyError);
          // Don't throw here - we can still return the analysis even if company creation fails
          console.log('Continuing without company creation...');
        } else {
          companyId = company.id;
          console.log('Successfully created NEW company with ID:', companyId, 'for user:', effectiveUserId);

          // Create company details
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
        }
      }

      // DELETE OLD SECTIONS AND CREATE NEW ONES (for both new and existing companies)
      if (companyId) {
        try {
          console.log('Deleting old sections for company:', companyId);
          
          // First get section IDs to delete their details
          const { data: sectionsToDelete } = await supabase
            .from('sections')
            .select('id')
            .eq('company_id', companyId);

          if (sectionsToDelete && sectionsToDelete.length > 0) {
            const sectionIds = sectionsToDelete.map(s => s.id);
            
            // Delete section details first
            const { error: deleteSectionDetailsError } = await supabase
              .from('section_details')
              .delete()
              .in('section_id', sectionIds);

            if (deleteSectionDetailsError) {
              console.error('Failed to delete old section details:', deleteSectionDetailsError);
            }
          }

          // Then delete sections
          const { error: deleteSectionsError } = await supabase
            .from('sections')
            .delete()
            .eq('company_id', companyId);

          if (deleteSectionsError) {
            console.error('Failed to delete old sections:', deleteSectionsError);
          } else {
            console.log('Deleted old sections');
          }

          // Create new sections based on latest analysis
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
        } catch (sectionError) {
          console.error('Error handling sections (non-fatal):', sectionError);
        }
      }
    } else {
      console.log('Not creating/updating company - no effective user ID');
    }

    // FINAL: Update the submission with analysis results and company_id
    console.log('Updating submission with final analysis results...');
    const { error: finalUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        company_id: companyId
      })
      .eq('id', submissionId);

    if (finalUpdateError) {
      console.error('Failed to update submission with final results:', finalUpdateError);
      // Don't throw here - the analysis was successful, just the status update failed
    }

    const successMessage = isNewCompany ? 
      `Successfully analyzed BARC submission ${submissionId} and created company ${companyId}` :
      `Successfully analyzed BARC submission ${submissionId} and updated company ${companyId}`;
    
    console.log(successMessage);

    // Always return success even if some parts failed
    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult,
        companyId,
        isNewCompany
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-barc-form function:', error);

    // Determine appropriate status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('Submission ID is required')) {
        statusCode = 400;
        errorCode = 'MISSING_SUBMISSION_ID';
      } else if (error.message.includes('Failed to fetch submission')) {
        statusCode = 404;
        errorCode = 'SUBMISSION_NOT_FOUND';
      } else if (error.message.includes('OpenAI API key not configured')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
      }
    }

    // Always return a proper HTTP response with CORS headers
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        submissionId,
        code: errorCode
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
