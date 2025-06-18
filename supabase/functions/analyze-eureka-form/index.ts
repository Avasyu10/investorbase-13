
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

    // Fetch submission data from eureka_form_submissions
    console.log('Fetching Eureka submission for analysis...');
    const { data: submission, error: fetchError } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved Eureka submission for analysis:', {
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

    // CRITICAL: Use atomic operation to prevent duplicate processing
    console.log('Attempting to acquire lock for Eureka submission analysis...');
    const { data: lockResult, error: lockError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending') // Only proceed if status is still pending
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
        console.log('Eureka submission already completed successfully');
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
        console.log('Eureka submission is currently being processed');
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

    console.log('Successfully acquired lock for Eureka submission analysis');

    // Determine the effective user ID for company creation
    const effectiveUserId = submission.user_id || submission.form_slug;
    console.log('Using effective user ID for company creation:', effectiveUserId);

    // Check for existing companies more comprehensively
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id, name, email, poc_name')
      .eq('name', submission.company_name)
      .eq('source', 'eureka_form')
      .eq('user_id', effectiveUserId);

    if (existingCompanies && existingCompanies.length > 0) {
      const existingCompany = existingCompanies[0];
      console.log('Found existing company, linking submission:', existingCompany.id);
      
      // Link the submission to existing company
      await supabase
        .from('eureka_form_submissions')
        .update({ 
          company_id: existingCompany.id,
          analysis_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      return new Response(
        JSON.stringify({ 
          success: true,
          submissionId,
          companyId: existingCompany.id,
          isNewCompany: false,
          message: 'Linked to existing company'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Build analysis prompt - Using EXACT same structure as BARC
    const analysisPrompt = `
    You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

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

    4. TEAM STRENGTH: "${submission.question_4 || 'Not provided'}"
    ${linkedInDataSection}
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Founder-Problem Fit (30-35 points): Domain expertise or lived experience with the problem?
    - Complementarity of Skills (30-35 points): Tech + business + ops coverage?
    - Execution History (30-35 points): Track record of building, selling, or scaling?
    
    Score harshly if: No domain experience, skill gaps, no execution track record
    Score highly if: Deep domain expertise, complementary skills, proven execution

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
    - FOR TEAM SECTION SPECIFICALLY: ${founderLinkedInData.length > 0 ? 'Start with founder LinkedIn insights in this exact format: "Founder Name: his/her relevant experience or achievement" for each founder with LinkedIn data available, then follow with 3-4 additional strengths related to the answer and market data.' : 'If LinkedIn data was provided, include founder-specific insights as described above'}

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
        "target_customers": {
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
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "team_strength": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": [${founderLinkedInData.length > 0 ? `"CRITICAL: Start with founder LinkedIn insights in this EXACT format for each founder: 'Founder Name: his/her relevant experience or achievement', then add 3-4 additional strengths with market data integration"` : `"exactly 4-5 strengths with market data integration - include LinkedIn founder insights if available"`}],
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
    1. CREATE SIGNIFICANT SCORE DIFFERENCES - excellent responses (80-100), poor responses (10-40)
    2. Use the exact metrics provided for each question in your evaluation
    3. ASSESSMENT POINTS: Each of the 8-10 points must be heavily weighted toward market data, numbers, and quantifiable metrics with 3-4 sentences each
    4. Focus weaknesses ONLY on market data challenges and industry risks - NOT response quality or form gaps
    5. Provide exactly 4-5 strengths and 4-5 weaknesses per section
    6. All scores must be 1-100 scale
    7. Return only valid JSON without markdown formatting
    8. FOR TEAM SECTION: ${founderLinkedInData.length > 0 ? 'MUST start strengths with founder LinkedIn insights in exact format: "Founder Name: his/her relevant experience or achievement" for each founder, then add 3-4 market-related strengths' : 'Include LinkedIn founder insights in strengths when available'}
    9. OVERALL ASSESSMENT PRIORITY: Market data and numbers take precedence over all other factors with detailed analysis
    `;

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for Eureka analysis...');
    
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
            content: 'You are an expert startup evaluator for incubator programs. Provide thorough, constructive analysis in valid JSON format. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Use the EXACT structure specified in the prompt.'
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
      console.log('Successfully parsed Eureka analysis result');
      console.log('Analysis sections structure:', Object.keys(analysisResult.sections || {}));
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned analysis text:', analysisText.substring(0, 500) + '...');
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Eureka analysis overall score:', analysisResult.overall_score);
    console.log('Eureka analysis sections:', Object.keys(analysisResult.sections || {}).length);

    // Create company
    console.log('Creating NEW company for analyzed Eureka submission...');
    
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

    const companyId = newCompany.id;
    console.log('Successfully created NEW company with ID:', companyId);

    // Create sections using the EXACT same structure as BARC - THIS IS THE KEY FIX
    console.log('Creating sections for company:', companyId);
    
    // Delete old sections first (in case of retry)
    await supabase
      .from('sections')
      .delete()
      .eq('company_id', companyId);

    // Create sections with the exact mapping from BARC form
    const sectionsToCreate = [];
    if (analysisResult.sections && typeof analysisResult.sections === 'object') {
      console.log('Processing analysis sections:', Object.keys(analysisResult.sections));
      
      // Use the EXACT section mappings from BARC form
      const sectionMappings = {
        'problem_solution_fit': { title: 'Problem & Solution Fit', type: 'analysis', section_type: 'problem_solution_fit' },
        'target_customers': { title: 'Target Customers & Market', type: 'analysis', section_type: 'target_customers' },
        'competitive_advantage': { title: 'Competitive Advantage', type: 'analysis', section_type: 'competitive_advantage' },
        'market_opportunity': { title: 'Market Opportunity', type: 'analysis', section_type: 'market_opportunity' },
        'team_strength': { title: 'Team & Execution', type: 'analysis', section_type: 'team_strength' }
      };

      for (const [sectionKey, sectionData] of Object.entries(analysisResult.sections)) {
        console.log(`Processing section: ${sectionKey}`, {
          hasScore: typeof sectionData.score === 'number',
          hasAnalysis: typeof sectionData.analysis === 'string',
          hasStrengths: Array.isArray(sectionData.strengths),
          hasImprovements: Array.isArray(sectionData.improvements)
        });

        const mapping = sectionMappings[sectionKey];
        if (mapping && sectionData && typeof sectionData === 'object') {
          sectionsToCreate.push({
            company_id: companyId,
            score: typeof sectionData.score === 'number' ? sectionData.score : 0,
            section_type: mapping.section_type,
            type: mapping.type,
            title: mapping.title,
            description: typeof sectionData.analysis === 'string' ? sectionData.analysis : 'No analysis provided'
          });
        } else {
          console.warn(`Skipping invalid section: ${sectionKey}`, { mapping: !!mapping, sectionData: typeof sectionData });
        }
      }
    } else {
      console.error('No valid sections found in analysis result:', analysisResult.sections);
    }

    console.log('Sections to create:', sectionsToCreate.length);
    console.log('Section data preview:', sectionsToCreate.map(s => ({ title: s.title, score: s.score, section_type: s.section_type })));

    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections successfully:', createdSections.length);

      // Create section details properly with proper detail_type values
      const sectionDetails = [];
      
      for (const section of createdSections) {
        console.log(`Creating details for section: ${section.title} (${section.section_type})`);
        
        // Find the corresponding analysis section data
        const analysisSection = analysisResult.sections[section.section_type];
        
        if (analysisSection) {
          console.log(`Processing section details for ${section.title}:`, {
            strengths: Array.isArray(analysisSection.strengths) ? analysisSection.strengths.length : 0,
            improvements: Array.isArray(analysisSection.improvements) ? analysisSection.improvements.length : 0
          });
          
          // Add strengths with correct detail_type
          if (Array.isArray(analysisSection.strengths)) {
            for (const strength of analysisSection.strengths) {
              if (strength && typeof strength === 'string' && strength.trim()) {
                sectionDetails.push({
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength.trim()
                });
              }
            }
          }
          
          // Add improvements as weaknesses with correct detail_type
          if (Array.isArray(analysisSection.improvements)) {
            for (const improvement of analysisSection.improvements) {
              if (improvement && typeof improvement === 'string' && improvement.trim()) {
                sectionDetails.push({
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: improvement.trim()
                });
              }
            }
          }
        } else {
          console.warn(`No analysis data found for section type: ${section.section_type}`);
        }
      }

      console.log('Total section details to create:', sectionDetails.length);
      console.log('Section details breakdown:', sectionDetails.reduce((acc, d) => {
        acc[d.detail_type] = (acc[d.detail_type] || 0) + 1;
        return acc;
      }, {}));

      if (sectionDetails.length > 0) {
        const { data: createdDetails, error: detailsError } = await supabase
          .from('section_details')
          .insert(sectionDetails)
          .select();

        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }

        console.log('Successfully created section details:', createdDetails?.length || 0);
        console.log('Created details by type:', 
          createdDetails?.reduce((acc, detail) => {
            acc[detail.detail_type] = (acc[detail.detail_type] || 1) + 1;
            return acc;
          }, {})
        );
      } else {
        console.warn('No section details to create');
      }
    } else {
      console.error('No sections created - this will cause UI issues');
    }

    // Update submission with final results
    console.log('Updating Eureka submission with final analysis results...');
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
      console.error('Failed to update Eureka submission:', updateError);
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log('Successfully analyzed Eureka submission', submissionId, 'and created company', companyId);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        companyId,
        isNewCompany: true,
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
          
          console.log('Updated Eureka submission status to failed');
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
