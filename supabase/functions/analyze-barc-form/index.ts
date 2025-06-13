
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
      founder_linkedin_urls: existingSubmission.founder_linkedin_urls
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

    // Check if analysis is currently processing
    if (existingSubmission.analysis_status === 'processing') {
      console.log('Submission is already being processed, returning conflict');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'This submission is already being analyzed. Please wait for it to complete.',
          submissionId,
          status: 'already_processing'
        }),
        {
          status: 409, // Conflict status
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the form details to find the owner
    let formOwnerId = null;
    if (existingSubmission.form_slug) {
      const { data: formData, error: formError } = await supabase
        .from('public_submission_forms')
        .select('user_id')
        .eq('form_slug', existingSubmission.form_slug)
        .single();

      if (formError) {
        console.error('Failed to fetch form data:', formError);
      } else if (formData) {
        formOwnerId = formData.user_id;
        console.log('Form owner ID:', formOwnerId);
      }
    }

    // Use the form owner as the user for the company, fallback to current user
    const effectiveUserId = formOwnerId || currentUserId;
    console.log('Using user ID for company creation:', effectiveUserId);

    // Check if a company already exists for this submission from previous attempts
    let existingCompanyId = existingSubmission.company_id;
    
    // If no company_id in submission but submission has company_name, check if company exists
    if (!existingCompanyId && existingSubmission.company_name && effectiveUserId) {
      console.log('Checking for existing company with same name for this user...');
      const { data: existingCompanies, error: companyCheckError } = await supabase
        .from('companies')
        .select('id, source, created_at')
        .eq('name', existingSubmission.company_name)
        .eq('user_id', effectiveUserId)
        .eq('source', 'barc_form')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!companyCheckError && existingCompanies && existingCompanies.length > 0) {
        existingCompanyId = existingCompanies[0].id;
        console.log('Found existing company with same name:', existingCompanyId);
        
        // Update the submission to link to this existing company
        await supabase
          .from('barc_form_submissions')
          .update({ company_id: existingCompanyId })
          .eq('id', submissionId);
      }
    }

    // Update status to processing with optimistic locking
    console.log('Attempting to update submission status to processing...');
    const { data: statusUpdateResult, error: statusUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing'
      })
      .eq('id', submissionId)
      .eq('analysis_status', existingSubmission.analysis_status) // Optimistic locking
      .select()
      .maybeSingle();

    if (statusUpdateError) {
      console.error('Error updating status:', statusUpdateError);
      throw new Error('Failed to start analysis - please try again');
    }

    if (!statusUpdateResult) {
      console.log('Status was not updated - another process is handling this submission');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Another analysis is already in progress for this submission.',
          submissionId,
          status: 'concurrent_processing'
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Successfully updated submission status to processing');

    // Scrape LinkedIn profiles if provided
    let linkedInContent = '';
    if (existingSubmission.founder_linkedin_urls && existingSubmission.founder_linkedin_urls.length > 0) {
      console.log('Found LinkedIn URLs to scrape:', existingSubmission.founder_linkedin_urls);
      
      try {
        // Call the scrape-linkedin function
        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('scrape-linkedin', {
          body: { 
            linkedInUrls: existingSubmission.founder_linkedin_urls,
            reportId: submissionId 
          }
        });

        if (scrapeError) {
          console.error('LinkedIn scraping error:', scrapeError);
          linkedInContent = '\n\nNote: LinkedIn profile scraping encountered issues, but continuing with analysis.\n';
        } else if (scrapeResult?.success && scrapeResult?.profiles) {
          console.log('LinkedIn profiles scraped successfully:', scrapeResult.profiles.length);
          
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
        }
      } catch (scrapeError) {
        console.error('LinkedIn scraping failed:', scrapeError);
        linkedInContent = '\n\nNote: LinkedIn profile scraping failed, but continuing with analysis.\n';
      }
    }

    // Enhanced analysis prompt with specific metrics-based scoring and market-focused weaknesses
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Your task is to provide a comprehensive and HIGHLY DISCRIMINATIVE analysis that clearly distinguishes between excellent and poor responses. Use the specific metrics provided for each question to score accurately.

    CRITICAL SCORING INSTRUCTION: You MUST create significant score differences between good and poor responses. Excellent answers should score 80-100, average answers 50-70, and poor/incomplete answers 10-40. DO NOT give similar scores to vastly different quality responses.

    Company Information:
    - Company Name: ${existingSubmission.company_name || 'Not provided'}
    - Registration Type: ${existingSubmission.company_registration_type || 'Not provided'}
    - Company Type: ${existingSubmission.company_type || 'Not provided'}
    - Executive Summary: ${existingSubmission.executive_summary || 'Not provided'}
    - Submitter Email: ${existingSubmission.submitter_email || 'Not provided'}

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

    4. TEAM STRENGTH: "${existingSubmission.question_4 || 'Not provided'}"
    ${linkedInContent}
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Founder-Problem Fit (30-35 points): Domain expertise or lived experience with the problem?
    - Complementarity of Skills (30-35 points): Tech + business + ops coverage?
    - Execution History (30-35 points): Track record of building, selling, or scaling?
    
    IMPORTANT: Use the LinkedIn profile data above to assess team strength more accurately. Consider the professional backgrounds, experience, education, and achievements shown in the LinkedIn profiles when evaluating founder-problem fit and execution history.
    
    Score harshly if: No domain experience, skill gaps, no execution track record
    Score highly if: Deep domain expertise, complementary skills, proven execution

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
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context, SPECIFICALLY incorporating insights from the LinkedIn profile data provided above",
          "strengths": ["exactly 4-5 strengths with market data integration, incorporating LinkedIn profile insights when available"],
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
    7. INCORPORATE LinkedIn profile insights into team strength analysis when available
    8. Return only valid JSON without markdown formatting
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API for enhanced metrics-based analysis with LinkedIn data...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert startup evaluator for IIT Bombay who uses specific metrics for highly discriminative scoring. You MUST create significant score differences between good and poor responses (excellent: 80-100, poor: 10-40). Use the exact metrics provided for each question. Generate exactly 6-7 assessment points with multiple market numbers in each. Provide exactly 4-5 strengths and 4-5 weaknesses per section. Focus weaknesses ONLY on market data challenges and industry risks - NOT on response quality or what should have been included in the form. When LinkedIn profile data is provided, incorporate those insights into the team strength analysis. Return only valid JSON without markdown formatting.'
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

    // COMPANY CREATION/UPDATE LOGIC - PREVENT DUPLICATES
    let companyId = existingCompanyId; // Use the company ID we found earlier
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
          throw new Error(`Failed to create company: ${companyError?.message || 'Unknown error'}`);
        }

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

      // DELETE OLD SECTIONS AND CREATE NEW ONES (for both new and existing companies)
      if (companyId) {
        console.log('Deleting old sections for company:', companyId);
        
        // First delete section details
        const { error: deleteSectionDetailsError } = await supabase
          .from('section_details')
          .delete()
          .in('section_id', 
            await supabase.from('sections').select('id').eq('company_id', companyId).then(res => 
              res.data?.map(s => s.id) || []
            )
          );

        if (deleteSectionDetailsError) {
          console.error('Failed to delete old section details:', deleteSectionDetailsError);
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
