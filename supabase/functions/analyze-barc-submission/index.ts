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
    console.log('Reading request body...');
    const requestBody = await req.json();
    submissionId = requestBody.submissionId;
    
    console.log('Received analysis request for submission:', submissionId);
    
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

    // Fetch the submission data first to make sure it exists
    console.log('Fetching submission data...');
    const { data: submission, error: fetchError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      throw new Error(`Failed to fetch submission: ${fetchError?.message || 'Submission not found'}`);
    }

    console.log('Retrieved submission:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      current_status: submission.analysis_status,
      company_type: submission.company_type,
      poc_name: submission.poc_name,
      phoneno: submission.phoneno
    });

    // DEBUG: Log the specific fields we're trying to map
    console.log('BARC submission fields to map:', {
      company_type: submission.company_type,
      submitter_email: submission.submitter_email,
      poc_name: submission.poc_name,
      phoneno: submission.phoneno
    });

    // Update status to processing
    console.log('Updating submission status to processing...');
    const { error: statusUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing'
      })
      .eq('id', submissionId);

    if (statusUpdateError) {
      console.error('Failed to update status to processing:', statusUpdateError);
    }

    // Prepare the analysis prompt
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses:
    1. Problem and Timing: ${submission.question_1 || 'Not provided'}
    2. Target Customers: ${submission.question_2 || 'Not provided'}
    3. Competitive Advantage: ${submission.question_3 || 'Not provided'}
    4. Team Background: ${submission.question_4 || 'Not provided'}
    5. Milestones and Support Needed: ${submission.question_5 || 'Not provided'}

    Please provide a detailed analysis covering:

    1. **Problem-Solution Fit** (Score: 1-100)
       - Clarity of problem definition
       - Market timing assessment
       - Solution relevance

    2. **Market Opportunity** (Score: 1-100)
       - Market size and potential
       - Customer acquisition strategy
       - Go-to-market approach

    3. **Competitive Advantage** (Score: 1-100)
       - Uniqueness of solution
       - Defensibility of moat
       - Competitive positioning

    4. **Team Strength** (Score: 1-100)
       - Relevant experience and expertise
       - Team composition
       - Domain knowledge

    5. **Execution Plan** (Score: 1-100)
       - Clarity of milestones
       - Realistic timeline
       - Resource requirements

    6. **Overall Assessment** (Score: 1-100)
       - Investment potential
       - Program fit
       - Risk assessment

    For each section, provide:
    - Numerical score (1-100)
    - Detailed analysis (2-3 paragraphs)
    - Key strengths
    - Areas for improvement
    - Specific recommendations

    Finally, provide:
    - Overall recommendation (Accept/Consider/Reject)
    - Summary of key decision factors
    - Suggested next steps

    Format your response as valid JSON with the following structure:
    {
      "overall_score": number (1-100),
      "recommendation": "Accept" | "Consider" | "Reject",
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "market_opportunity": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "competitive_advantage": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "team_strength": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "execution_plan": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        },
        "overall_assessment": {
          "score": number (1-100),
          "analysis": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        }
      },
      "summary": {
        "key_factors": ["string"],
        "next_steps": ["string"],
        "overall_feedback": "string"
      }
    }
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API...');
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
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, constructive analysis in valid JSON format. All scores must be on a scale of 1-100.'
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
    console.log('OpenAI response status:', openaiResponse.status);
    console.log('OpenAI response received, parsing...');

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      throw new Error('Invalid response structure from OpenAI');
    }

    const analysisText = openaiData.choices[0].message.content;

    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', analysisText);
      throw new Error('Analysis response was not valid JSON');
    }

    // Check if company already exists
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      // Create new company with complete BARC submission data
      console.log('Creating new company with BARC submission data...');
      const companyData = {
        name: submission.company_name,
        overall_score: analysisResult.overall_score,
        assessment_points: [],
        user_id: submission.user_id || null,
        source: 'barc_form',
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };

      console.log('DEBUG: Company data being inserted:', companyData);
      console.log('DEBUG: Specific field values:', {
        industry: companyData.industry,
        email: companyData.email,
        poc_name: companyData.poc_name,
        phonenumber: companyData.phonenumber
      });

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select('*')
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      isNewCompany = true;
      console.log('Successfully created new company with ID:', companyId);
      console.log('DEBUG: Created company data:', newCompany);
    } else {
      // Update existing company with complete BARC submission data
      console.log('Updating existing company with BARC submission data...');
      const updateData = {
        overall_score: analysisResult.overall_score,
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };

      console.log('DEBUG: Company update data:', updateData);

      const { data: updatedCompany, error: updateCompanyError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId)
        .select('*')
        .single();

      if (updateCompanyError) {
        console.error('Error updating company:', updateCompanyError);
        throw new Error(`Failed to update company: ${updateCompanyError.message}`);
      }

      console.log('Successfully updated existing company with ID:', companyId);
      console.log('DEBUG: Updated company data:', updatedCompany);
    }

    // Update the submission with analysis results and company ID
    console.log('Updating submission with analysis results...');
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

    console.log(`Successfully analyzed BARC submission ${submissionId} and ${isNewCompany ? 'created' : 'updated'} company ${companyId}`);

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
    console.error('Error in analyze-barc-submission function:', error);

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
