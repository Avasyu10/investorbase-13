
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

    // Fetch the submission data first
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

    console.log('Retrieved submission for analysis:', {
      id: submission.id,
      company_name: submission.company_name,
      submitter_email: submission.submitter_email,
      form_slug: submission.form_slug
    });

    // Get the form details to find the owner (separate query to avoid JOIN issues)
    let formOwnerId = null;
    if (submission.form_slug) {
      const { data: formData, error: formError } = await supabase
        .from('public_submission_forms')
        .select('user_id')
        .eq('form_slug', submission.form_slug)
        .single();

      if (formError) {
        console.error('Failed to fetch form data:', formError);
        // Continue without form owner - we'll use current user or create without user
      } else if (formData) {
        formOwnerId = formData.user_id;
        console.log('Form owner ID:', formOwnerId);
      }
    }

    // Use the form owner as the user for the company, fallback to current user
    const effectiveUserId = formOwnerId || currentUserId;
    console.log('Using user ID for company creation:', effectiveUserId);

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

    // Prepare the comprehensive analysis prompt with enhanced market data integration
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program with deep market knowledge and access to industry data. Analyze the following startup application and provide comprehensive feedback that combines the applicant's responses with specific market data, industry trends, and real numbers.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Company Type: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}
    - Submitter Email: ${submission.submitter_email || 'Not provided'}

    Application Responses:

    1. Problem and Timing: "${submission.question_1 || 'Not provided'}"
    2. Customer Discovery: "${submission.question_2 || 'Not provided'}"
    3. Competitive Advantage: "${submission.question_3 || 'Not provided'}"
    4. Team Background: "${submission.question_4 || 'Not provided'}"
    5. Incubation Goals: "${submission.question_5 || 'Not provided'}"

    ENHANCED ANALYSIS INSTRUCTIONS:

    For each section metric, provide analysis that:
    1. PRIMARILY focuses on the applicant's answers to the questions
    2. INCORPORATES specific market data with actual numbers (market size, growth rates, investment figures, user adoption rates, etc.)
    3. References industry trends, competitive landscape, and market timing with concrete data points
    4. Includes market opportunity size with specific dollar amounts or user base numbers
    5. Cites relevant industry reports, funding rounds, or market research findings where applicable

    For strengths and weaknesses in each section:
    - Use SPECIFIC market data and numbers to support or challenge the applicant's claims
    - Reference actual market growth rates, competitive dynamics, and industry benchmarks
    - Include concrete examples from the industry or similar companies
    - Mention specific market opportunities with quantified potential

    For overall assessment points:
    - Include detailed market analysis with specific numbers and trends
    - Reference actual market conditions, growth projections, and industry data
    - Provide context about market timing and competitive positioning with concrete examples
    - Include specific market size figures, growth rates, and investment trends relevant to the industry

    Please provide a detailed analysis in the following JSON format. IMPORTANT: All scores must be on a scale of 1-5 (not 1-10):

    {
      "overall_score": number (1-5),
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from the application and market context)",
        "stage": "string (e.g., Idea, Prototype, Early Revenue, Growth)",
        "introduction": "string (2-3 sentence company description based on executive summary, responses, and market positioning)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-5),
          "analysis": "detailed analysis text that evaluates the problem statement against current market needs, timing, and industry pain points with specific market data and trends",
          "strengths": ["detailed strength 1 with specific market data, numbers, and industry context", "detailed strength 2 with market trends and concrete examples"],
          "improvements": ["detailed improvement area 1 with market data and competitive analysis", "detailed improvement area 2 with industry benchmarks and specific recommendations"]
        },
        "market_opportunity": {
          "score": number (1-5),
          "analysis": "detailed analysis text that combines customer discovery answers with specific market size data, growth projections, addressable market figures, and industry trends",
          "strengths": ["detailed strength 1 with market size numbers, growth rates, and industry data", "detailed strength 2 with specific market opportunities and competitive positioning"],
          "improvements": ["detailed improvement area 1 with market research gaps and specific data needs", "detailed improvement area 2 with competitive analysis and market positioning recommendations"]
        },
        "competitive_advantage": {
          "score": number (1-5),
          "analysis": "detailed analysis text that evaluates stated advantages against actual competitive landscape, market positioning, and industry differentiation with specific examples",
          "strengths": ["detailed strength 1 with competitive analysis and market positioning data", "detailed strength 2 with differentiation factors and industry examples"],
          "improvements": ["detailed improvement area 1 with competitive landscape analysis and specific recommendations", "detailed improvement area 2 with market positioning and differentiation strategies"]
        },
        "team_strength": {
          "score": number (1-5),
          "analysis": "detailed analysis text that assesses team background against industry requirements, market needs, and successful team compositions in similar markets",
          "strengths": ["detailed strength 1 with industry experience context and market relevance", "detailed strength 2 with team composition analysis and industry benchmarks"],
          "improvements": ["detailed improvement area 1 with specific skill gaps and industry requirements", "detailed improvement area 2 with team development recommendations and market context"]
        },
        "execution_plan": {
          "score": number (1-5),
          "analysis": "detailed analysis text that evaluates incubation goals and execution strategy against market realities, industry benchmarks, and successful execution patterns",
          "strengths": ["detailed strength 1 with execution feasibility and market timing analysis", "detailed strength 2 with resource planning and industry best practices"],
          "improvements": ["detailed improvement area 1 with execution challenges and market-specific recommendations", "detailed improvement area 2 with milestone planning and industry timeline expectations"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback that synthesizes form responses with detailed market context, industry positioning, and specific market opportunities",
        "key_factors": ["detailed factor 1 combining answers with specific market insights and data", "detailed factor 2 with market trends and competitive analysis", "detailed factor 3 with industry positioning and growth potential"],
        "next_steps": ["detailed step 1 with market-informed recommendations and specific actions", "detailed step 2 with industry best practices and concrete milestones", "detailed step 3 with market opportunities and strategic positioning"],
        "assessment_points": ["detailed assessment point 1 with specific market data, growth rates, and industry context that validates or challenges the business model", "detailed assessment point 2 with competitive landscape analysis, market positioning data, and concrete market opportunities", "detailed assessment point 3 with industry trends, investment patterns, and market timing considerations including specific numbers", "detailed assessment point 4 with customer acquisition insights, market penetration strategies, and industry benchmarks with actual data", "detailed assessment point 5 with scaling potential, market expansion opportunities, and long-term industry projections with quantified metrics"]
      }
    }

    Focus on providing actionable insights that combine the applicant's responses with specific, quantified market intelligence. Include market-informed assessment points that highlight concrete market opportunities, competitive positioning with numbers, industry trends with growth data, and realistic growth potential while staying grounded in the specific answers provided by the applicant. Use actual market figures, growth percentages, investment amounts, and industry statistics wherever possible to support your analysis.
    `;

    // Call OpenAI API
    console.log('Calling OpenAI API for enhanced market analysis...');
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
            content: 'You are an expert startup evaluator for IIT Bombay with comprehensive market knowledge and access to industry data. Provide thorough, market-informed analysis with specific numbers, growth rates, market sizes, and industry trends in valid JSON format only. All scores must be on a scale of 1-5. Integrate detailed market data with quantified metrics alongside form responses to provide comprehensive evaluation with concrete market insights. Do not wrap your response in markdown code blocks or any other formatting - return only the raw JSON object.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
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

    // Ensure the overall score is properly normalized to 1-5 scale
    if (analysisResult.overall_score > 5) {
      console.log('Normalizing score from', analysisResult.overall_score, 'to 5-point scale');
      analysisResult.overall_score = Math.min(Math.round(analysisResult.overall_score / 2), 5);
    }

    // Create company and sections for ALL analysis results (not just Accept)
    let companyId = null;
    if (effectiveUserId) {
      console.log('Creating company and sections for analyzed submission...');
      
      // Extract company info from analysis
      const companyInfo = analysisResult.company_info || {};
      
      // Create company with proper user_id and company information
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: submission.company_name,
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
      console.log('Successfully created company with ID:', companyId, 'for user:', effectiveUserId);

      // Create company details with additional info
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

      // Create sections based on analysis
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
            
            // Add improvements
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

      // Generate real-time market research after company creation
      if (companyId) {
        console.log('Generating real-time market research for company:', companyId);
        
        // Prepare market research prompt
        const marketResearchPrompt = `
        Generate comprehensive real-time market research for the startup ${submission.company_name || 'this startup'} based on the following information:

        Company: ${submission.company_name || 'Not provided'}
        Industry: ${companyInfo.industry || 'Not provided'}
        Executive Summary: ${submission.executive_summary || 'Not provided'}
        
        Please provide research in the following JSON format:
        {
          "market_research": {
            "content": "Detailed market research analysis with current market size, growth trends, key players, and market dynamics. Include specific numbers, percentages, and recent data from credible sources.",
            "sources": ["Source 1: Description", "Source 2: Description"]
          },
          "latest_news": {
            "content": "Recent news and developments in the industry or related to similar companies. Include funding announcements, partnerships, regulatory changes, and market movements from the last 6 months.",
            "sources": ["News Source 1: Description", "News Source 2: Description"]
          },
          "market_trends": {
            "content": "Current and emerging market trends, technology adoption patterns, consumer behavior shifts, and future outlook. Include quantified data about trend growth rates and market predictions.",
            "sources": ["Trend Source 1: Description", "Trend Source 2: Description"]
          }
        }
        
        Ensure all content is relevant, recent, and includes credible source attributions. Focus on actionable market intelligence.
        `;

        const marketResearchResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'You are a market research analyst providing comprehensive, data-driven market intelligence. Generate detailed research with specific numbers, recent data, and credible sources. Return only valid JSON without markdown formatting.'
              },
              {
                role: 'user',
                content: marketResearchPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (marketResearchResponse.ok) {
          const marketData = await marketResearchResponse.json();
          let marketResearchText = marketData.choices[0].message.content;
          
          // Clean up the response
          if (marketResearchText.startsWith('```json')) {
            marketResearchText = marketResearchText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (marketResearchText.startsWith('```')) {
            marketResearchText = marketResearchText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          try {
            const marketResearchResult = JSON.parse(marketResearchText);
            
            // Store market research in company record
            const { error: marketUpdateError } = await supabase
              .from('companies')
              .update({
                market_research: marketResearchResult.market_research?.content || '',
                latest_news: marketResearchResult.latest_news?.content || '',
                market_trends: marketResearchResult.market_trends?.content || '',
                market_research_sources: [
                  ...(marketResearchResult.market_research?.sources || []),
                  ...(marketResearchResult.latest_news?.sources || []),
                  ...(marketResearchResult.market_trends?.sources || [])
                ]
              })
              .eq('id', companyId);

            if (marketUpdateError) {
              console.error('Failed to update market research:', marketUpdateError);
            } else {
              console.log('Successfully updated market research for company');
            }
          } catch (parseError) {
            console.error('Failed to parse market research JSON:', parseError);
          }
        } else {
          console.error('Market research API call failed:', marketResearchResponse.status);
        }
      }
    } else {
      console.log('Not creating company because no user ID available');
    }

    // Update the submission with analysis results and company_id
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

    console.log(`Successfully analyzed BARC submission ${submissionId}${companyId ? ` and created company ${companyId}` : ''}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        submissionId,
        analysisResult,
        companyId
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
