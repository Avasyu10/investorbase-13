
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

    // Retry mechanism to handle timing issues
    let submission = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!submission && retryCount < maxRetries) {
      console.log(`Attempt ${retryCount + 1} to fetch submission...`);
      
      if (retryCount > 0) {
        // Add progressive delay for retries
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      const { data: fetchedSubmission, error: fetchError } = await supabase
        .from('eureka_form_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();

      if (fetchError) {
        console.error(`Fetch error on attempt ${retryCount + 1}:`, fetchError);
        if (retryCount === maxRetries - 1) {
          throw new Error(`Failed to fetch submission after ${maxRetries} attempts: ${fetchError.message}`);
        }
      } else if (fetchedSubmission) {
        submission = fetchedSubmission;
        console.log('Successfully fetched submission on attempt', retryCount + 1);
      } else {
        console.warn(`Submission not found on attempt ${retryCount + 1}, retrying...`);
      }
      
      retryCount++;
    }

    if (!submission) {
      throw new Error(`Submission not found after ${maxRetries} attempts`);
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

    // Check if already processing or completed using an atomic update
    console.log('Attempting to acquire lock for submission analysis...');
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
        console.log('Submission already completed successfully');
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
        console.log('Submission is currently being processed');
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

    console.log('Successfully acquired lock for submission analysis');

    // Determine the effective user ID for company creation
    const effectiveUserId = submission.user_id || submission.form_slug;
    console.log('Using effective user ID for company creation:', effectiveUserId);

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

    // Build analysis prompt with submission data
    const analysisPrompt = `
    You are an expert startup evaluator with a BALANCED and ENCOURAGING assessment approach. Your goal is to provide constructive feedback that highlights potential while identifying areas for growth.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and Evaluation Guidelines:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Evaluate using these balanced metrics:
    - Problem Understanding (35 pts): Look for genuine problem identification and customer pain points. Reward clear thinking even if briefly expressed.
    - Solution Innovation (35 pts): Assess logical problem-solution fit and creative approaches. Value practical solutions over complex descriptions.
    - Market Awareness (30 pts): Recognize understanding of target market and competitive landscape. Appreciate any market insights provided.

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Evaluate with these encouraging guidelines:
    - Customer Clarity (40 pts): Value specific customer identification and clear targeting. Reward precision over elaborate descriptions.
    - Use Case Relevance (35 pts): Look for realistic scenarios and problem-solution alignment. Appreciate concrete examples.
    - Market Validation (25 pts): Recognize any customer research or validation efforts mentioned, however basic.

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Assess with balanced perspective:
    - Competitive Knowledge (40 pts): Appreciate awareness of competitors and market players. Value honest competitive assessment.
    - Differentiation Strategy (35 pts): Look for unique value propositions and competitive advantages. Reward clear positioning.
    - Market Positioning (25 pts): Recognize strategic thinking about market dynamics and competitive landscape.

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    Evaluate business understanding supportively:
    - Revenue Clarity (35 pts): Look for clear monetization approaches and pricing thinking. Value realistic revenue plans.
    - Financial Logic (35 pts): Assess understanding of business economics and scalability. Appreciate any financial projections.
    - Growth Strategy (30 pts): Recognize expansion potential and growth planning. Value practical scaling approaches.

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Assess unique value positively:
    - Unique Value (40 pts): Identify genuine differentiation and customer benefits. Reward authentic uniqueness.
    - Defensibility (35 pts): Look for sustainable advantages and competitive moats. Appreciate strategic thinking.
    - Go-to-Market (25 pts): Assess customer acquisition strategies and market entry plans. Value actionable approaches.

    BALANCED EVALUATION PHILOSOPHY:

    SCORING APPROACH - BE ENCOURAGING AND FAIR:
    - QUALITY FOCUS: Reward genuine insight and strategic thinking (70% weight)
    - EFFORT RECOGNITION: Acknowledge clear effort and thoughtful responses (20% weight)
    - COMPLETENESS: Consider thoroughness but don't over-penalize brevity (10% weight)

    BALANCED SCORING BANDS (ENCOURAGING APPROACH):
    85-100: Exceptional insight with clear strategic understanding and strong market awareness
    75-84: Good understanding with solid thinking and reasonable market knowledge
    65-74: Decent comprehension with some strategic insight and basic market understanding
    55-64: Basic understanding with effort shown, some insights present but limited depth
    45-54: Minimal understanding but clear effort made, generic responses with some relevance
    35-44: Poor quality with limited insight, very basic responses but some attempt made
    25-34: Very poor quality with little relevance, minimal effort shown
    15-24: Extremely poor with no clear understanding, one-word or nonsensical responses
    0-14: No response or completely irrelevant content

    ENCOURAGING PENALTIES (SUPPORTIVE APPROACH):
    - Brief but insightful answers: Can score 75+ if they show real understanding
    - Effort with limited insight: Minimum 50-60 range to encourage entrepreneurial spirit
    - Generic but relevant responses: 55-65 range, recognizing attempt and basic understanding
    - One-word answers: 15-25 range but look for any context that might increase score

    MARKET CONTEXT INTEGRATION:
    Integrate relevant market data including market sizes, growth rates, competitive landscape, and industry benchmarks to provide context for evaluation. Focus on how the startup's responses demonstrate market understanding and strategic positioning.

    For ASSESSMENT POINTS (8-10 points required):
    Each point should be 3-4 sentences combining market intelligence with startup evaluation. Include specific figures, growth rates, industry data, and competitive insights that provide actionable business intelligence.

    CRITICAL CHANGE - BALANCED STRENGTHS AND IMPROVEMENTS:

    STRENGTHS (exactly 4-5 per section):
    - Focus on what they did well and positive aspects of their responses
    - Include market context that supports their approach
    - Highlight strategic thinking and business understanding demonstrated
    - Connect their insights to industry opportunities and market potential
    - Each strength should be 2-3 sentences emphasizing positive aspects

    IMPROVEMENTS (exactly 3-4 per section - REDUCED FROM 4-5):
    - Focus on GROWTH OPPORTUNITIES rather than weaknesses
    - Suggest market-informed enhancements and strategic development areas
    - Frame as "opportunities to strengthen" rather than "weaknesses"
    - Include market data that shows potential for improvement
    - Each improvement should be 2-3 sentences focused on growth potential

    SCORING REASON REQUIREMENT:
    Provide a 1-2 sentence explanation that focuses on the POSITIVE aspects and potential demonstrated, while acknowledging areas for development.

    Return analysis in this JSON format:
    {
      "overall_score": number (1-100),
      "scoring_reason": "Brief 1-2 sentence explanation emphasizing positive aspects and potential while noting development areas",
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 encouraging strengths (2-3 sentences each) with market context"],
          "improvements": ["exactly 3-4 growth opportunities (2-3 sentences each) framed positively with market guidance"]
        },
        "target_customers": {
          "score": number (1-100),
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 encouraging strengths (2-3 sentences each) with market context"],
          "improvements": ["exactly 3-4 growth opportunities (2-3 sentences each) framed positively with market guidance"]
        },
        "competitors": {
          "score": number (1-100),
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 encouraging strengths (2-3 sentences each) with market context"],
          "improvements": ["exactly 3-4 growth opportunities (2-3 sentences each) framed positively with market guidance"]
        },
        "revenue_model": {
          "score": number (1-100),
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 encouraging strengths (2-3 sentences each) with market context"],
          "improvements": ["exactly 3-4 growth opportunities (2-3 sentences each) framed positively with market guidance"]
        },
        "differentiation": {
          "score": number (1-100),
          "analysis": "detailed balanced analysis highlighting positives first, then areas for growth",
          "strengths": ["exactly 4-5 encouraging strengths (2-3 sentences each) with market context"],
          "improvements": ["exactly 3-4 growth opportunities (2-3 sentences each) framed positively with market guidance"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive encouraging feedback focusing on potential and positive aspects while providing constructive guidance",
        "key_factors": ["key positive factors and potential demonstrated with supportive market validation"],
        "next_steps": ["specific encouraging recommendations with market-informed guidance for growth"],
        "assessment_points": [
          "EXACTLY 8-10 detailed market-focused assessment points combining positive startup insights with market intelligence",
          "Each point must be 3-4 sentences emphasizing opportunities and potential with market data",
          "Include market sizes, growth rates, competitive landscape metrics, funding trends, adoption rates",
          "Frame market challenges as opportunities for strategic positioning and growth",
          "Connect startup's approach to positive industry trends and market opportunities",
          "Provide encouraging analysis of market fit and strategic potential with actionable intelligence"
        ]
      }
    }

    CRITICAL REQUIREMENTS:
    1. BE ENCOURAGING AND BALANCED - Focus on potential and positive aspects while providing constructive guidance
    2. REASONABLE SCORING - Use the full range appropriately, don't cluster scores too low
    3. REDUCE IMPROVEMENTS - Only 3-4 improvements per section, focus on growth opportunities
    4. POSITIVE FRAMING - Frame challenges as opportunities and emphasize potential
    5. MARKET SUPPORT - Use market data to support positive positioning and strategic opportunities
    6. EFFORT RECOGNITION - Acknowledge entrepreneurial effort and strategic thinking demonstrated
    7. Return only valid JSON without markdown formatting
    8. Include scoring_reason that emphasizes positive aspects and potential
    9. Be supportive while maintaining professional evaluation standards
    `;

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for analysis...');
    
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
            content: 'You are an encouraging and balanced startup evaluator. Your role is to identify potential and provide constructive guidance while maintaining professional standards. Focus on positive aspects and frame challenges as growth opportunities. Be supportive of entrepreneurial efforts while providing valuable insights. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Always emphasize potential and positive aspects in your scoring_reason.'
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
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned analysis text:', analysisText.substring(0, 500) + '...');
      throw new Error('Analysis response was not valid JSON');
    }

    console.log('Analysis overall score:', analysisResult.overall_score);
    console.log('Analysis recommendation:', analysisResult.recommendation);
    console.log('Analysis scoring reason:', analysisResult.scoring_reason);

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const companyData = {
        name: submission.company_name,
        overall_score: analysisResult.overall_score,
        assessment_points: analysisResult.summary?.assessment_points || [],
        scoring_reason: analysisResult.scoring_reason || null,
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

      companyId = newCompany.id;
      console.log('Successfully created NEW company with ID:', companyId);
    } else {
      console.log('Updating existing company...');
      
      const updateData = {
        overall_score: analysisResult.overall_score,
        assessment_points: analysisResult.summary?.assessment_points || [],
        scoring_reason: analysisResult.scoring_reason || null,
        industry: submission.company_type || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };

      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (updateCompanyError) {
        console.error('Error updating company:', updateCompanyError);
        throw new Error(`Failed to update company: ${updateCompanyError.message}`);
      }

      console.log('Successfully updated existing company with ID:', companyId);
    }

    // Create sections
    console.log('Creating sections for company:', companyId);
    
    // Delete old sections first
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
      score: sectionData.score || 0,
      section_type: sectionName,
      type: 'analysis',
      title: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: sectionData.analysis || ''
    }));

    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', sectionsToCreate.length);

      // Create section details (strengths and improvements)
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
          
          // Add improvements (now fewer and positively framed)
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

      if (sectionDetails.length > 0) {
        const { error: detailsError } = await supabase
          .from('section_details')
          .insert(sectionDetails);

        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }

        console.log('Created section details:', sectionDetails.length);
      }
    }

    // Update submission with final results
    console.log('Updating submission with final analysis results...');
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
      console.error('Failed to update submission:', updateError);
      throw new Error(`Failed to update submission: ${updateError.message}`);
    }

    console.log('Successfully analyzed Eureka submission', submissionId, 'and', isNewCompany ? 'created' : 'updated', 'company', companyId);

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
