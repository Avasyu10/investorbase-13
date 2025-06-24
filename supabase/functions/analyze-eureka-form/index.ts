
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    console.log('Request method:', req.method);
    
    const requestBody = await req.json();
    console.log('Received request body:', requestBody);
    
    const submissionId = requestBody.submissionId;
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retry mechanism to fetch submission (database might need time to commit)
    let submission;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts} to fetch submission...`);
      
      const { data, error } = await supabase
        .from('eureka_form_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (error) {
        console.error('Error fetching submission:', error);
        if (attempts === maxAttempts) {
          throw new Error(`Submission not found after ${maxAttempts} attempts`);
        }
        console.log(`Submission not found on attempt ${attempts}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        continue;
      }

      submission = data;
      console.log(`Successfully fetched submission on attempt ${attempts}`);
      break;
    }

    if (!submission) {
      throw new Error(`Submission not found after ${maxAttempts} attempts`);
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

    // Check if analysis is already in progress or completed
    if (submission.analysis_status === 'processing') {
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

    if (submission.analysis_status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          submissionId,
          message: 'Analysis already completed',
          status: 'completed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to acquire a lock for processing
    console.log('Attempting to acquire lock for submission analysis...');
    const { error: lockError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending');

    if (lockError) {
      console.log('Could not acquire lock - submission is already being processed or completed');
      return new Response(
        JSON.stringify({
          success: true,
          submissionId,
          message: 'Submission is currently being processed',
          status: 'processing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Successfully acquired lock for submission analysis');

    // For public submissions, we'll use the form_slug as a fallback identifier
    // but NOT as a user_id for database operations
    const effectiveUserId = submission.user_id || null; // Keep null for public submissions
    console.log('Using effective user ID for company creation:', effectiveUserId);

    // Build analysis prompt
    const analysisPrompt = `
You are an expert startup analyst evaluating a Eureka form submission. Please analyze the following startup application and provide detailed feedback.

Company Information:
- Company Name: ${submission.company_name || 'Not provided'}
- Industry: ${submission.company_type || 'Not specified'}
- Executive Summary: ${submission.executive_summary || 'Not provided'}
- Registration Type: ${submission.company_registration_type || 'Not specified'}

Application Questions:
1. Problem/Solution: ${submission.question_1 || 'Not answered'}
2. Target Customers: ${submission.question_2 || 'Not answered'}
3. Competitors: ${submission.question_3 || 'Not answered'}
4. Revenue Model: ${submission.question_4 || 'Not answered'}
5. Competitive Advantage: ${submission.question_5 || 'Not answered'}

Contact Information:
- POC Name: ${submission.poc_name || 'Not provided'}
- Email: ${submission.submitter_email || 'Not provided'}
- Phone: ${submission.phoneno || 'Not provided'}
- Company LinkedIn: ${submission.company_linkedin_url || 'Not provided'}
- Founder LinkedIn URLs: ${submission.founder_linkedin_urls ? submission.founder_linkedin_urls.join(', ') : 'Not provided'}

Please provide a comprehensive analysis in the following JSON format:
{
  "overall_score": [number between 0-100],
  "recommendation": "[Accept/Reject/Further Review]",
  "scoring_reason": "[detailed explanation of the overall score]",
  "section_analysis": {
    "problem_solution_fit": {
      "score": [0-20],
      "feedback": "[detailed feedback]"
    },
    "target_customers": {
      "score": [0-20], 
      "feedback": "[detailed feedback]"
    },
    "competitors": {
      "score": [0-20],
      "feedback": "[detailed feedback]" 
    },
    "revenue_model": {
      "score": [0-20],
      "feedback": "[detailed feedback]"
    },
    "differentiation": {
      "score": [0-20],
      "feedback": "[detailed feedback]"
    }
  },
  "market_context": "[industry-specific insights and market context]",
  "improvement_suggestions": "[specific actionable recommendations]",
  "assessment_points": [
    "[key insight 1]",
    "[key insight 2]",
    "[key insight 3]",
    "[etc - provide 5-10 key assessment points]"
  ]
}

Focus on providing constructive, actionable feedback that helps the startup improve their application and business model.
`;

    console.log('Calling Gemini API for analysis...');
    
    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: analysisPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    console.log('Gemini response received, parsing...');

    const analysisText = geminiResult.candidates[0].content.parts[0].text;
    console.log('Raw analysis text received from Gemini');

    // Parse the JSON response from Gemini
    let analysisResult;
    try {
      // Extract JSON from the response (handle potential markdown formatting)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      analysisResult = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse analysis result from Gemini');
    }

    // Extract key metrics
    const overallScore = analysisResult.overall_score || 0;
    const recommendation = analysisResult.recommendation || 'Further Review';
    const scoringReason = analysisResult.scoring_reason || 'Analysis completed';
    const assessmentPoints = analysisResult.assessment_points || [];

    console.log('Analysis overall score:', overallScore);
    console.log('Analysis recommendation:', recommendation);
    console.log('Analysis scoring reason:', scoringReason);

    // Calculate section scores
    const sectionAnalysis = analysisResult.section_analysis || {};
    console.log('Section scores:');
    console.log('problem_solution_fit:', sectionAnalysis.problem_solution_fit?.score || 0);
    console.log('target_customers:', sectionAnalysis.target_customers?.score || 0);
    console.log('competitors:', sectionAnalysis.competitors?.score || 0);
    console.log('revenue_model:', sectionAnalysis.revenue_model?.score || 0);
    console.log('differentiation:', sectionAnalysis.differentiation?.score || 0);

    // Create company record
    console.log('Creating NEW company for analyzed submission...');
    
    const companyData = {
      name: submission.company_name,
      overall_score: overallScore,
      assessment_points: assessmentPoints,
      scoring_reason: scoringReason,
      user_id: effectiveUserId, // This will be null for public submissions
      source: 'eureka_form',
      industry: submission.company_type,
      email: submission.submitter_email,
      poc_name: submission.poc_name,
      phonenumber: submission.phoneno
    };

    console.log('Company data to insert:', companyData);

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    console.log('Company created successfully:', company.id);

    // Create sections for the company
    const sections = [
      {
        title: 'Problem/Solution Fit',
        description: sectionAnalysis.problem_solution_fit?.feedback || 'No analysis available',
        score: sectionAnalysis.problem_solution_fit?.score || 0,
        type: 'problem_solution_fit',
        company_id: company.id
      },
      {
        title: 'Target Customers',
        description: sectionAnalysis.target_customers?.feedback || 'No analysis available',
        score: sectionAnalysis.target_customers?.score || 0,
        type: 'target_customers',
        company_id: company.id
      },
      {
        title: 'Competitors',
        description: sectionAnalysis.competitors?.feedback || 'No analysis available',
        score: sectionAnalysis.competitors?.score || 0,
        type: 'competitors',
        company_id: company.id
      },
      {
        title: 'Revenue Model',
        description: sectionAnalysis.revenue_model?.feedback || 'No analysis available',
        score: sectionAnalysis.revenue_model?.score || 0,
        type: 'revenue_model',
        company_id: company.id
      },
      {
        title: 'Differentiation',
        description: sectionAnalysis.differentiation?.feedback || 'No analysis available',
        score: sectionAnalysis.differentiation?.score || 0,
        type: 'differentiation',
        company_id: company.id
      }
    ];

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sections);

    if (sectionsError) {
      console.error('Error creating sections:', sectionsError);
      // Don't throw here, company creation was successful
    } else {
      console.log('Sections created successfully');
    }

    // Update submission with analysis results
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        company_id: company.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      // Don't throw here, analysis was successful
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        companyId: company.id,
        analysis: analysisResult,
        message: 'Analysis completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-eureka-form function:', error);
    
    // Update submission status to failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const requestBody = await new Request(req.clone()).json();
        const submissionId = requestBody.submissionId;
        
        await supabase
          .from('eureka_form_submissions')
          .update({
            analysis_status: 'failed',
            analysis_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
        
        console.log('Updated submission status to failed');
      }
    } catch (updateError) {
      console.error('Error updating submission status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
