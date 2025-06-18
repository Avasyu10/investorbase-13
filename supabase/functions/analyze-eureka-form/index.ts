
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
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Problem Clarity (30 pts): Is it real, urgent, and well-articulated?
    - Current Alternatives (30 pts): Are existing coping methods explained clearly?
    - Solution Fit (30 pts): Is the solution directly tackling the core pain point?
    
    Score harshly if: Problem is vague or generic, no insight into how people cope, unclear connection between problem and solution.
    Score highly if: Clear, urgent pain point + solid understanding of alternatives + compelling solution match.

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Customer Definition (35 pts): Are the segments specific and realistic?
    - Use Case Relevance (35 pts): Does the product clearly serve these users?
    - Depth of Understanding (30 pts): Shows behavioral, demographic, or need-based insight?
    
    Score harshly if: Describes "everyone" or is overly broad.
    Score highly if: Defined personas, nuanced insights, matched offering.

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Competitor Awareness (35 pts): Are both direct and indirect players mentioned?
    - Comparison Clarity (35 pts): Is differentiation from competitors clear?
    - Strategic Positioning (30 pts): Do they show where they fit in the landscape?
    
    Score harshly if: Misses obvious competitors or gives vague comparisons
    Score highly if: Deep landscape awareness and sharp positioning.

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - Monetization Clarity (30 pts): Is revenue generation clearly explained?
    - Cost/Revenue Drivers (35 pts): Are cost factors and revenue influencers identified?
    - Scalability & Growth (35 pts): Is there a future roadmap for expansion?
    
    Score harshly if: No revenue clarity or hand-wavy growth claims.
    Score highly if: Structured, feasible model + strong growth potential.

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be highly discriminative):
    - USP Clarity (30 pts): Clear, strong differentiator from others?
    - Customer Pull Strategy (35 pts): Effective tactics to attract and retain users?
    - IP or Moat (35 pts): Any defensibility—tech, brand, data, or network effects?
    
    Score harshly if: No meaningful edge, or vague marketing.
    Score highly if: Compelling USP + solid GTM + proprietary advantage.

    SCORING GUIDELINES - BE HIGHLY DISCRIMINATIVE:
    - 90-100: Exceptional responses with deep insights, clear evidence, comprehensive understanding
    - 80-89: Strong responses with good evidence and understanding, minor gaps
    - 70-79: Adequate responses with some evidence, moderate understanding
    - 60-69: Weak responses with limited evidence, significant gaps
    - 40-59: Poor responses with minimal substance, major deficiencies
    - 20-39: Very poor responses, largely inadequate or missing key elements
    - 1-19: Extremely poor or non-responses

    For ASSESSMENT POINTS (8-10 points required):
    Each point MUST be detailed (3-4 sentences each) and contain specific numbers: market sizes ($X billion), growth rates (X% CAGR), customer metrics ($X CAC), competitive data, success rates (X%), and industry benchmarks, seamlessly integrated with response evaluation.

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
          "Each point must be 3-4 sentences long and prioritize market data and numbers above all else"
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
            content: 'You are an expert startup evaluator. Provide thorough, constructive analysis in valid JSON format. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.'
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
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned analysis text:', analysisText.substring(0, 500) + '...');
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Eureka analysis overall score:', analysisResult.overall_score);
    console.log('Eureka analysis recommendation:', analysisResult.recommendation);

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

    // Create sections
    console.log('Creating sections for company:', companyId);
    
    // Delete old sections first (in case of retry)
    await supabase
      .from('sections')
      .delete()
      .eq('company_id', companyId);

    const sectionMappings = {
      'problem_solution_fit': { title: 'Problem & Solution', type: 'problem_solution_fit' },
      'target_customers': { title: 'Target Customers', type: 'target_customers' },
      'competitors': { title: 'Competitors', type: 'competitors' },
      'revenue_model': { title: 'Revenue Model', type: 'revenue_model' },
      'differentiation': { title: 'Differentiation', type: 'differentiation' }
    };

    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionName, sectionData]: [string, any]) => {
      const mapping = sectionMappings[sectionName as keyof typeof sectionMappings];
      return {
        company_id: companyId,
        score: sectionData.score || 0,
        section_type: mapping?.type || sectionName,
        type: 'analysis',
        title: mapping?.title || sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: sectionData.analysis || ''
      };
    });

    console.log('Sections to create:', sectionsToCreate.length);

    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', createdSections.length);

      // Create section details (strengths and weaknesses) - THIS IS THE CRITICAL FIX
      const sectionDetails = [];
      
      for (const section of createdSections) {
        const sectionKey = section.section_type;
        const sectionData = analysisResult.sections[sectionKey];
        
        if (sectionData) {
          console.log(`Processing section details for ${sectionKey}:`, {
            strengths: sectionData.strengths?.length || 0,
            improvements: sectionData.improvements?.length || 0
          });
          
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

      console.log('Total section details to create:', sectionDetails.length);

      if (sectionDetails.length > 0) {
        const { error: detailsError } = await supabase
          .from('section_details')
          .insert(sectionDetails);

        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }

        console.log('Successfully created section details:', sectionDetails.length);
      } else {
        console.warn('No section details to create');
      }
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
