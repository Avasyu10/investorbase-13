
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
    
    console.log('🔍 EUREKA: Received request body:', { submissionId });
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('🔍 EUREKA: Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openaiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission data from eureka_form_submissions
    console.log('🔍 EUREKA: Fetching submission for analysis...');
    const { data: submission, error: fetchError } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('❌ EUREKA: Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('🔍 EUREKA: Retrieved submission for analysis:', {
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
    console.log('🔍 EUREKA: Attempting to acquire lock for submission analysis...');
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
      console.error('❌ EUREKA: Error acquiring lock:', lockError);
      throw new Error(`Failed to acquire processing lock: ${lockError.message}`);
    }

    if (!lockResult) {
      console.log('⚠️ EUREKA: Could not acquire lock - submission is already being processed or completed');
      // Check current status and return accordingly
      const { data: currentSubmission } = await supabase
        .from('eureka_form_submissions')
        .select('analysis_status, company_id')
        .eq('id', submissionId)
        .single();

      if (currentSubmission?.analysis_status === 'completed' && currentSubmission?.company_id) {
        console.log('✅ EUREKA: Submission already completed successfully');
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
        console.log('🔄 EUREKA: Submission is currently being processed');
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

    console.log('✅ EUREKA: Successfully acquired lock for submission analysis');

    // Determine the effective user ID for company creation
    const effectiveUserId = submission.user_id || submission.form_slug;
    console.log('🔍 EUREKA: Using effective user ID for company creation:', effectiveUserId);

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
              console.log('🔍 EUREKA: Found LinkedIn data for:', url.trim());
            }
          } catch (error) {
            console.warn(`⚠️ EUREKA: Error fetching LinkedIn data for ${url}:`, error);
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
    const analysisPrompt = `You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

Company Information:
- Company Name: ${submission.company_name || 'Not provided'}
- Registration Type: ${submission.company_registration_type || 'Not provided'}
- Industry: ${submission.company_type || 'Not provided'}
- Executive Summary: ${submission.executive_summary || 'Not provided'}

Application Responses:

1. PROBLEM & TIMING: "${submission.question_1 || 'Not provided'}"

2. CUSTOMER DISCOVERY: "${submission.question_2 || 'Not provided'}"

3. COMPETITIVE ADVANTAGE: "${submission.question_3 || 'Not provided'}"

4. TEAM STRENGTH: "${submission.question_4 || 'Not provided'}"
${linkedInDataSection}

5. EXECUTION PLAN: "${submission.question_5 || 'Not provided'}"

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
      "analysis": "detailed analysis evaluating response quality with market context",
      "strengths": ["exactly 4-5 strengths with market data integration"],
      "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry"]
    },
    "market_opportunity": {
      "score": number (1-100),
      "analysis": "detailed analysis evaluating response quality with market context",
      "strengths": ["exactly 4-5 strengths with market data integration"],
      "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry"]
    },
    "competitive_advantage": {
      "score": number (1-100),
      "analysis": "detailed analysis evaluating response quality with market context",
      "strengths": ["exactly 4-5 strengths with market data integration"],
      "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry"]
    },
    "team_strength": {
      "score": number (1-100),
      "analysis": "detailed analysis evaluating response quality with market context",
      "strengths": ["exactly 4-5 strengths with market data integration"],
      "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry"]
    },
    "execution_plan": {
      "score": number (1-100),
      "analysis": "detailed analysis evaluating response quality with market context",
      "strengths": ["exactly 4-5 strengths with market data integration"],
      "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry"]
    }
  },
  "summary": {
    "overall_feedback": "comprehensive feedback integrating response quality with market context",
    "key_factors": ["key decision factors with market validation"],
    "next_steps": ["specific recommendations with market-informed guidance"],
    "assessment_points": [
      "EXACTLY 8-10 detailed market-focused assessment points that combine insights across all sections",
      "Each point must be 3-4 sentences long and prioritize market data and numbers above all else",
      "Include specific market sizes, growth rates, customer acquisition costs, competitive landscape metrics, funding trends, adoption rates, etc.",
      "Focus on quantifiable market opportunities, risks, and benchmarks with actionable intelligence"
    ]
  }
}

CRITICAL REQUIREMENTS:
1. CREATE SIGNIFICANT SCORE DIFFERENCES - excellent responses (80-100), poor responses (10-40)
2. All scores must be 1-100 scale
3. Return only valid JSON without markdown formatting
4. Be highly discriminative in scoring - use the full 1-100 range
5. Focus on actual response quality and market context`;

    // Call OpenAI for analysis
    console.log('🤖 EUREKA: Calling OpenAI API for analysis...');
    console.log('🤖 EUREKA: Prompt preview:', analysisPrompt.substring(0, 300) + '...');
    
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
            content: 'You are an expert startup evaluator. Provide thorough, constructive analysis in valid JSON format. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Be highly discriminative in scoring - use the full 1-100 range.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    console.log('🤖 EUREKA: OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ EUREKA: OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('🤖 EUREKA: OpenAI response received, parsing...');

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error('❌ EUREKA: Invalid OpenAI response structure:', openaiData);
      throw new Error('Invalid response structure from OpenAI');
    }

    let analysisText = openaiData.choices[0].message.content;
    console.log('🤖 EUREKA: Raw analysis text received (first 500 chars):', analysisText.substring(0, 500));

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
      console.log('✅ EUREKA: Successfully parsed analysis result');
      console.log('🎯 EUREKA: Analysis overall score:', analysisResult.overall_score);
      console.log('🎯 EUREKA: Analysis recommendation:', analysisResult.recommendation);
      console.log('🎯 EUREKA: Assessment points count:', analysisResult.summary?.assessment_points?.length || 0);
    } catch (parseError) {
      console.error('❌ EUREKA: Failed to parse OpenAI response as JSON:', parseError);
      console.error('❌ EUREKA: Cleaned analysis text:', analysisText);
      throw new Error('Analysis response was not valid JSON');
    }

    // Validate that we have a proper analysis result
    if (!analysisResult.overall_score || !analysisResult.sections) {
      console.error('❌ EUREKA: Analysis result missing required fields:', analysisResult);
      throw new Error('Analysis result is incomplete');
    }

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('🏢 EUREKA: Creating NEW company for analyzed submission...');
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
        phonenumber: submission.phoneno || null,
        introduction: analysisResult.company_info?.introduction || 'No description available.',
        stage: analysisResult.company_info?.stage || 'Not specified'
      };

      console.log('🏢 EUREKA: Company data to insert:', companyData);
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (companyError) {
        console.error('❌ EUREKA: Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('✅ EUREKA: Successfully created NEW company with ID:', companyId);
    } else {
      console.log('🔄 EUREKA: Updating existing company...');
      
      const updateData = {
        overall_score: analysisResult.overall_score,
        assessment_points: analysisResult.summary?.assessment_points || [],
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null,
        introduction: analysisResult.company_info?.introduction || 'No description available.',
        stage: analysisResult.company_info?.stage || 'Not specified'
      };

      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateCompanyError) {
        console.error('❌ EUREKA: Error updating company:', updateCompanyError);
        throw new Error(`Failed to update company: ${updateCompanyError.message}`);
      }

      console.log('✅ EUREKA: Successfully updated existing company with ID:', companyId);
    }

    // Create sections
    console.log('📊 EUREKA: Creating sections for company:', companyId);
    
    // Delete old sections first
    const { error: deleteError } = await supabase
      .from('sections')
      .delete()
      .eq('company_id', companyId);

    if (deleteError) {
      console.error('❌ EUREKA: Error deleting old sections:', deleteError);
    } else {
      console.log('✅ EUREKA: Deleted old sections');
    }

    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionName, sectionData]: [string, any]) => ({
      company_id: companyId,
      score: sectionData.score || 0,
      section_type: sectionName,
      type: 'analysis',
      title: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: sectionData.analysis || ''
    }));

    console.log('📊 EUREKA: Sections to create:', sectionsToCreate.length);

    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('❌ EUREKA: Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('✅ EUREKA: Created sections:', createdSections.length);

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

      console.log('📊 EUREKA: Section details to create:', sectionDetails.length);

      if (sectionDetails.length > 0) {
        const { error: detailsError } = await supabase
          .from('section_details')
          .insert(sectionDetails);

        if (detailsError) {
          console.error('❌ EUREKA: Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }

        console.log('✅ EUREKA: Created section details:', sectionDetails.length);
      }
    }

    // Update submission with final results
    console.log('🔄 EUREKA: Updating submission with final analysis results...');
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
      console.error('❌ EUREKA: Failed to update submission:', updateError);
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log('🎉 EUREKA: Successfully analyzed submission', submissionId, 'and', isNewCompany ? 'created' : 'updated', 'company', companyId);

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
    console.error('❌ EUREKA: Error in analyze-eureka-form function:', error);

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
          
          console.log('🔄 EUREKA: Updated submission status to failed');
        }
      } catch (updateError) {
        console.error('❌ EUREKA: Failed to update error status:', updateError);
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
