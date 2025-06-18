
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

    // Build analysis prompt - Using EXACT same structure as BARC
    const analysisPrompt = `
You are an expert startup evaluator for an incubator program. Analyze the following Eureka startup application and provide a comprehensive assessment.

Company Information:
- Company Name: ${submission.company_name || 'Not provided'}
- Registration Type: ${submission.company_registration_type || 'Not provided'}
- Industry: ${submission.company_type || 'Not provided'}
- Executive Summary: ${submission.executive_summary || 'Not provided'}

Application Responses:

1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
   
2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
   
3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
   
4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"

Contact Information:
- Point of Contact: ${submission.poc_name || 'Not provided'}
- Email: ${submission.submitter_email}
- Phone: ${submission.phoneno || 'Not provided'}
- LinkedIn URLs: ${submission.founder_linkedin_urls?.join(', ') || 'Not provided'}
- Company LinkedIn: ${submission.company_linkedin_url || 'Not provided'}

CRITICAL: You MUST return analysis in this EXACT JSON format (no markdown, no code blocks):

{
  "overall_score": number (1-100),
  "recommendation": "Accept/Reject/Conditional Accept",
  "company_info": {
    "stage": "Early Stage/Growth Stage/Mature",
    "industry": "string",
    "introduction": "Brief company overview in 2-3 sentences"
  },
  "summary": {
    "overall_feedback": "Comprehensive overall assessment paragraph",
    "assessment_points": ["8-10 detailed assessment points with specific insights"],
    "key_factors": ["4-5 key success/risk factors"],
    "next_steps": ["4-5 recommended next steps for evaluation"]
  },
  "sections": {
    "problem_solution_fit": {
      "score": number (1-100),
      "analysis": "Detailed analysis of problem identification and solution fit",
      "strengths": ["4-5 specific strengths"],
      "improvements": ["4-5 areas for improvement"]
    },
    "target_customers": {
      "score": number (1-100),
      "analysis": "Detailed analysis of customer segmentation and validation",
      "strengths": ["4-5 specific strengths"],
      "improvements": ["4-5 areas for improvement"]
    },
    "competitive_advantage": {
      "score": number (1-100),
      "analysis": "Detailed analysis of competitive positioning and differentiation",
      "strengths": ["4-5 specific strengths"],
      "improvements": ["4-5 areas for improvement"]
    },
    "market_opportunity": {
      "score": number (1-100),
      "analysis": "Detailed analysis of market size, growth, and opportunity",
      "strengths": ["4-5 specific strengths"],
      "improvements": ["4-5 areas for improvement"]
    },
    "team_strength": {
      "score": number (1-100),
      "analysis": "Detailed analysis of team capabilities and execution potential",
      "strengths": ["4-5 specific strengths"],
      "improvements": ["4-5 areas for improvement"]
    }
  }
}

REQUIREMENTS:
1. All scores must be between 1-100
2. Provide exactly 4-5 items in each strengths/improvements array
3. Assessment points must be 8-10 detailed insights
4. Analysis must be comprehensive and actionable
5. Return ONLY valid JSON without markdown formatting
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

    // Create sections using the EXACT same structure as BARC
    console.log('Creating sections for company:', companyId);
    
    // Delete old sections first (in case of retry)
    await supabase
      .from('sections')
      .delete()
      .eq('company_id', companyId);

    // FIXED: Using exact same section mappings as BARC
    const sectionMappings = {
      'problem_solution_fit': { title: 'Problem & Solution', type: 'analysis', section_type: 'problem_solution_fit' },
      'target_customers': { title: 'Target Customers', type: 'analysis', section_type: 'target_customers' },
      'competitive_advantage': { title: 'Competitive Advantage', type: 'analysis', section_type: 'competitive_advantage' },
      'market_opportunity': { title: 'Market Opportunity', type: 'analysis', section_type: 'market_opportunity' },
      'team_strength': { title: 'Team Strength', type: 'analysis', section_type: 'team_strength' }
    };

    const sectionsToCreate = [];
    if (analysisResult.sections && typeof analysisResult.sections === 'object') {
      for (const [sectionKey, sectionData] of Object.entries(analysisResult.sections)) {
        const mapping = sectionMappings[sectionKey];
        if (mapping && sectionData) {
          sectionsToCreate.push({
            company_id: companyId,
            score: sectionData.score || 0,
            section_type: mapping.section_type,
            type: mapping.type,
            title: mapping.title,
            description: sectionData.analysis || ''
          });
        }
      }
    }

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

      // FIXED: Create section details properly with proper detail_type values
      const sectionDetails = [];
      
      for (const section of createdSections) {
        // Find the corresponding analysis section by mapping
        const sectionKey = Object.keys(sectionMappings).find(key => 
          sectionMappings[key].section_type === section.section_type
        );
        
        const analysisSection = sectionKey ? analysisResult.sections[sectionKey] : null;
        
        if (analysisSection) {
          console.log(`Processing section details for ${section.title}:`, {
            strengths: analysisSection.strengths?.length || 0,
            improvements: analysisSection.improvements?.length || 0
          });
          
          // Add strengths with correct detail_type
          if (analysisSection.strengths && Array.isArray(analysisSection.strengths)) {
            for (const strength of analysisSection.strengths) {
              if (strength && strength.trim()) {
                sectionDetails.push({
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength.trim()
                });
              }
            }
          }
          
          // Add improvements as weaknesses with correct detail_type
          if (analysisSection.improvements && Array.isArray(analysisSection.improvements)) {
            for (const improvement of analysisSection.improvements) {
              if (improvement && improvement.trim()) {
                sectionDetails.push({
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: improvement.trim()
                });
              }
            }
          }
        }
      }

      console.log('Total section details to create:', sectionDetails.length);
      console.log('Section details breakdown:', sectionDetails.map(d => ({ type: d.detail_type, section_id: d.section_id })));

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
            acc[detail.detail_type] = (acc[detail.detail_type] || 0) + 1;
            return acc;
          }, {})
        );
      } else {
        console.warn('No section details to create - check analysis result structure');
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
