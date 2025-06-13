
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Fetch submission data
    console.log('Fetching submission for analysis...');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      form_slug: submission.form_slug,
      existing_company_id: submission.existing_company_id,
      analysis_status: submission.analysis_status,
      founder_linkedin_urls: submission.founder_linkedin_urls || [],
      company_linkedin_url: submission.company_linkedin_url,
      user_id: submission.user_id
    });

    // Check if already processing or completed using an atomic update
    console.log('Attempting to acquire lock for submission analysis...');
    const { data: lockResult, error: lockError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending')
      .select()
      .maybeSingle();

    if (lockError) {
      console.error('Error acquiring lock:', lockError);
      throw new Error(`Failed to acquire processing lock: ${lockError.message}`);
    }

    if (!lockResult) {
      console.log('Could not acquire lock - submission is already being processed or completed');
      throw new Error('Submission is already being analyzed or has been completed');
    }

    console.log('Successfully acquired lock for submission analysis');

    // Determine the effective user ID for company creation
    const effectiveUserId = submission.user_id || submission.form_slug;
    console.log('Using effective user ID for company creation:', effectiveUserId);

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for enhanced metrics-based analysis...');
    
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application and provide a comprehensive assessment with specific metrics and market insights.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses:
    1. Problem and Solution: ${submission.question_1 || 'Not provided'}
    2. Target Market: ${submission.question_2 || 'Not provided'}
    3. Competitive Advantage: ${submission.question_3 || 'Not provided'}
    4. Team Background: ${submission.question_4 || 'Not provided'}
    5. Growth Strategy: ${submission.question_5 || 'Not provided'}

    Please provide a detailed analysis with specific market metrics and assessment points covering:

    1. **Problem-Solution Fit Assessment** (Score: 1-100)
    2. **Market Opportunity Analysis** (Score: 1-100)
    3. **Competitive Positioning** (Score: 1-100)
    4. **Team Capability Evaluation** (Score: 1-100)
    5. **Execution Readiness** (Score: 1-100)
    6. **Overall Investment Potential** (Score: 1-100)

    For the overall assessment, provide 6 specific market metrics or assessment points that include:
    - Market size data with specific figures
    - Customer acquisition cost estimates
    - Competitive landscape insights
    - Regulatory or compliance considerations
    - Growth trajectory expectations
    - Risk factors with quantified impact

    Format your response as valid JSON:
    {
      "overall_score": number (1-100),
      "recommendation": "Accept" | "Consider" | "Reject",
      "assessment_points": [
        "Market metric or insight with specific data point",
        "Customer acquisition insight with cost estimates",
        "Competitive analysis with market share data",
        "Regulatory consideration with compliance costs",
        "Growth projection with timeline",
        "Risk assessment with impact quantification"
      ],
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed analysis",
          "strengths": ["strength 1", "strength 2"],
          "improvements": ["improvement 1", "improvement 2"]
        },
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "detailed analysis", 
          "strengths": ["strength 1", "strength 2"],
          "improvements": ["improvement 1", "improvement 2"]
        },
        "competitive_positioning": {
          "score": number (1-100),
          "analysis": "detailed analysis",
          "strengths": ["strength 1", "strength 2"], 
          "improvements": ["improvement 1", "improvement 2"]
        },
        "team_capability": {
          "score": number (1-100),
          "analysis": "detailed analysis",
          "strengths": ["strength 1", "strength 2"],
          "improvements": ["improvement 1", "improvement 2"] 
        },
        "execution_readiness": {
          "score": number (1-100),
          "analysis": "detailed analysis",
          "strengths": ["strength 1", "strength 2"],
          "improvements": ["improvement 1", "improvement 2"]
        },
        "overall_assessment": {
          "score": number (1-100),
          "analysis": "detailed analysis",
          "strengths": ["strength 1", "strength 2"],
          "improvements": ["improvement 1", "improvement 2"]
        }
      }
    }
    `;

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
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, constructive analysis in valid JSON format with specific market metrics and data points.'
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

    const analysisText = openaiData.choices[0].message.content;
    console.log('Raw analysis text received from OpenAI');

    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Analysis overall score:', analysisResult.overall_score);
    console.log('Analysis recommendation:', analysisResult.recommendation);

    // Create or update company
    let companyId = submission.existing_company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: submission.company_name,
          overall_score: analysisResult.overall_score,
          assessment_points: analysisResult.assessment_points || [],
          user_id: effectiveUserId,
          source: 'barc_form'
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('Successfully created NEW company with ID:', companyId, 'for user:', effectiveUserId);
    }

    // Create company details
    const { error: detailsError } = await supabase
      .from('company_details')
      .upsert({
        company_id: companyId,
        ...analysisResult
      });

    if (detailsError) {
      console.error('Error creating company details:', detailsError);
      throw new Error(`Failed to create company details: ${detailsError.message}`);
    }

    console.log('Created company details');

    // Create sections
    console.log('Deleting old sections for company:', companyId);
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
      name: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      score: sectionData.score || 0,
      analysis: sectionData.analysis || '',
      strengths: sectionData.strengths || [],
      improvements: sectionData.improvements || [],
      section_type: sectionName
    }));

    if (sectionsToCreate.length > 0) {
      const { error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate);

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', sectionsToCreate.length);
    }

    // Update submission with final results (NO LinkedIn scraping here)
    console.log('Updating submission with final analysis results...');
    const { error: updateError } = await supabase
      .from('barc_form_submissions')
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

    console.log('Successfully analyzed BARC submission', submissionId, 'and created company', companyId);

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
    console.error('Error in analyze-barc-form function:', error);

    // Update submission with error status if we have submissionId
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
