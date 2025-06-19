
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
    You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and Specific Metrics for Evaluation:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (FOCUS ON QUALITY AND INSIGHT):
    - Problem Understanding (35 pts): Clear identification of a real problem with evidence, understanding of pain points and target market. Quality matters more than length - a concise but insightful answer scores higher than a long but vague one.
    - Solution Innovation (35 pts): Logical connection between problem and solution, uniqueness of approach, feasibility. Value clear, actionable solutions even if briefly described.
    - Market Awareness (30 pts): Understanding of alternatives, competitive landscape, market dynamics. Reward specific examples and insights regardless of answer length.
    
    QUALITY-FIRST SCORING: A brief but insightful answer (e.g., "Small restaurants struggle with inventory management - our AI predicts demand reducing 30% waste") scores higher than a long but generic response.

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (FOCUS ON SPECIFICITY AND INSIGHT):
    - Customer Clarity (40 pts): Specific customer segments with clear characteristics. Reward precise targeting even in brief answers (e.g., "busy working parents aged 25-40 with household income $75k+").
    - Use Case Relevance (35 pts): Clear problem-solution fit with realistic scenarios. Value concrete examples over lengthy descriptions.
    - Market Validation (25 pts): Evidence of customer research, interviews, or validation. Appreciate any genuine customer insights mentioned.
    
    INSIGHT OVER LENGTH: "Restaurant owners with 10-50 employees struggling with staff scheduling" is better than a paragraph of generic customer descriptions.

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (VALUE COMPETITIVE INSIGHT):
    - Competitive Knowledge (40 pts): Awareness of specific competitors with clear differentiation. Reward naming actual companies and understanding their positioning.
    - Differentiation Strategy (35 pts): Clear unique value proposition vs competitors. Appreciate specific advantages even if briefly stated.
    - Market Positioning (25 pts): Strategic understanding of competitive landscape. Value realistic assessment of competitive dynamics.
    
    STRATEGIC THINKING: "Unlike Slack's broad focus, we target construction teams with industry-specific features" shows better insight than generic competitive analysis.

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    Evaluate using these EXACT metrics (PRIORITIZE BUSINESS UNDERSTANDING):
    - Revenue Clarity (35 pts): Specific monetization approach with realistic pricing. Value clear revenue streams even if simply described.
    - Financial Logic (35 pts): Understanding of unit economics, cost structure, scalability. Reward any specific numbers or realistic projections.
    - Growth Strategy (30 pts): Scalable revenue model with expansion potential. Appreciate practical growth plans regardless of detail level.
    
    BUSINESS ACUMEN: "SaaS model: $50/month per restaurant, targeting 1000 customers = $600k ARR" shows strong understanding even if brief.

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (REWARD UNIQUE VALUE):
    - Unique Value (40 pts): Clear differentiation with specific customer benefits. Value genuine uniqueness even if concisely expressed.
    - Defensibility (35 pts): Sustainable competitive advantages, barriers to entry. Appreciate any real moats or IP mentioned.
    - Go-to-Market (25 pts): Practical customer acquisition and retention strategy. Reward actionable plans over theoretical frameworks.
    
    TRUE INNOVATION: "Patent-pending AI algorithm + exclusive restaurant data partnerships" shows strong differentiation regardless of explanation length.

    CRITICAL EVALUATION PHILOSOPHY - QUALITY AND INSIGHT FIRST:

    EVALUATION PRIORITY ORDER:
    1. INSIGHT QUALITY: Does the response demonstrate deep understanding and strategic thinking? (80% weight)
    2. SPECIFICITY: Are there concrete examples, numbers, or specific details? (15% weight)  
    3. COMPLETENESS: Does it address all parts of the question? (5% weight)
    4. Length is NOT a factor - brief but insightful answers score higher than long but shallow ones

    BALANCED SCORING BANDS (QUALITY-FOCUSED):
    90-100: Exceptional insight with specific examples and strategic understanding, regardless of length
    80-89: Strong understanding with good specificity and clear strategic thinking
    70-79: Good comprehension with reasonable specificity, shows market understanding
    60-69: Basic understanding with some insight, may lack specificity but shows effort
    50-59: Minimal understanding with little insight, generic or unclear responses
    40-49: Poor understanding with no real insight, very generic statements
    30-39: Very poor quality with minimal relevance to the question
    20-29: Extremely poor with little to no understanding demonstrated
    10-19: One-word or nonsensical responses with no value
    0-9: No response or completely irrelevant content

    BALANCED PENALTIES (NOT OVERLY HARSH):
    - One-word answers without context: 10-20 range (but allow for exceptions if the word demonstrates insight)
    - Generic responses without specifics: 40-50 range (but reward any genuine insights)
    - Answers that show some understanding but lack depth: 60-70 range
    - Brief but insightful answers: Can score 80+ if they demonstrate real understanding

    MARKET INTEGRATION REQUIREMENT:
    For each section, integrate relevant market data including: market size figures, growth rates, customer acquisition costs, competitive landscape data, industry benchmarks, success rates, and financial metrics. Focus on how well the startup's response demonstrates understanding of market realities.

    For ASSESSMENT POINTS (8-10 points required):
    Each point MUST be detailed (3-4 sentences each) and contain specific numbers: market sizes ($X billion), growth rates (X% CAGR), customer metrics ($X CAC), competitive data, success rates (X%), and industry benchmarks, seamlessly integrated with response evaluation. Each assessment point should provide substantial market intelligence that connects startup positioning with industry realities, competitive dynamics, and growth opportunities.

    CRITICAL CHANGE - For STRENGTHS and WEAKNESSES (exactly 4-5 each per section):
    
    STRENGTHS must include detailed market data and be specific about their response quality:
    - Focus on how well they addressed the evaluation metrics with supporting market context
    - Include specific market figures, growth rates, industry benchmarks, and competitive data
    - Connect their insights to broader industry trends and opportunities
    - Validate their understanding with real market intelligence
    - Each strength should be 2-3 sentences with concrete market data integration
    
    WEAKNESSES must focus ONLY on market data challenges and industry-specific risks that the company faces, NOT on response quality or form completeness:
    - Market saturation concerns (X% of market already captured by incumbents with specific data)
    - High customer acquisition costs in this sector ($X CAC vs industry average of $Y)
    - Regulatory challenges affecting X% of similar companies in their industry
    - Economic headwinds impacting sector growth (X% decline in funding or market contraction)
    - Technology adoption barriers affecting X% of target market with supporting data
    - Competitive pressure from well-funded players with $X backing and market share data
    - Market timing risks based on industry cycles with historical data
    - Supply chain constraints affecting X% of companies in this sector
    - Pricing pressure in market with average margins of X% declining by Y%
    - Each weakness should be 2-3 sentences with specific market data and industry metrics

    CRITICAL ADDITION - SCORING REASON REQUIREMENT:
    Generate a brief 1-2 sentence explanation for the overall score that summarizes the key factors that led to this rating, focusing on the QUALITY and INSIGHT demonstrated in responses rather than just metrics coverage.
    
      "overall_score": number (1-100),
      "scoring_reason": "Brief 1-2 sentence explanation focusing on answer quality, insight depth, and strategic understanding demonstrated across all sections",
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating answer quality and insight first, then how well the response addresses the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 detailed strengths (2-3 sentences each) focusing on how well they addressed the metrics with extensive market data integration including specific figures, growth rates, industry benchmarks"],
          "improvements": ["exactly 4-5 market data challenges/risks (2-3 sentences each) the company faces in this industry with specific metrics and industry data - NOT response quality issues"]
        },
        "target_customers": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating answer quality and insight first, then how well the response addresses the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 detailed strengths (2-3 sentences each) focusing on how well they addressed the metrics with extensive market data integration including specific figures, growth rates, industry benchmarks"],
          "improvements": ["exactly 4-5 market data challenges/risks (2-3 sentences each) the company faces in this industry with specific metrics and industry data - NOT response quality issues"]
        },
        "competitors": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating answer quality and insight first, then how well the response addresses the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 detailed strengths (2-3 sentences each) focusing on how well they addressed the metrics with extensive market data integration including specific figures, growth rates, industry benchmarks"],
          "improvements": ["exactly 4-5 market data challenges/risks (2-3 sentences each) the company faces in this industry with specific metrics and industry data - NOT response quality issues"]
        },
        "revenue_model": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating answer quality and insight first, then how well the response addresses the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 detailed strengths (2-3 sentences each) focusing on how well they addressed the metrics with extensive market data integration including specific figures, growth rates, industry benchmarks"],
          "improvements": ["exactly 4-5 market data challenges/risks (2-3 sentences each) the company faces in this industry with specific metrics and industry data - NOT response quality issues"]
        },
        "differentiation": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating answer quality and insight first, then how well the response addresses the 3 specific metrics with market context",
          "strengths": ["exactly 4-5 detailed strengths (2-3 sentences each) focusing on how well they addressed the metrics with extensive market data integration including specific figures, growth rates, industry benchmarks"],
          "improvements": ["exactly 4-5 market data challenges/risks (2-3 sentences each) the company faces in this industry with specific metrics and industry data - NOT response quality issues"]
        }
      },
      "summary": {
        "overall_feedback": "comprehensive feedback focusing on the quality of responses and depth of understanding demonstrated across all sections",
        "key_factors": ["key decision factors based on answer quality and depth of insight with market validation"],
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
    1. EVALUATE PRIMARILY ON INSIGHT QUALITY - strategic thinking, market understanding, and business acumen demonstrated in each response
    2. BALANCED PENALTIES - don't be overly harsh on brief answers if they show genuine insight and understanding
    3. REWARD SPECIFICITY - look for concrete examples, numbers, customer validation, and market understanding
    4. LENGTH IS NOT A SCORING FACTOR - brief but insightful answers can score 80+ if they demonstrate real understanding
    5. ASSESSMENT POINTS: Each of the 8-10 points must be heavily weighted toward market data, numbers, and quantifiable metrics with 3-4 sentences each
    6. STRENGTHS: Must include detailed market data (2-3 sentences each) and focus on how well they addressed the metrics with specific industry figures and benchmarks
    7. WEAKNESSES: Focus ONLY on market data challenges and industry risks (2-3 sentences each) with specific metrics - NOT response quality or form gaps
    8. Provide exactly 4-5 strengths and 4-5 weaknesses per section
    9. All scores must be 1-100 scale
    10. Return only valid JSON without markdown formatting
    11. MUST include scoring_reason field with brief 1-2 sentence justification focusing on answer quality and insight depth
    12. Be FAIR and BALANCED - reward genuine insight regardless of answer length, but penalize truly poor quality responses appropriately
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
            content: 'You are an expert startup evaluator with balanced but high standards. Prioritize answer quality and insight over length. Brief but insightful answers can score highly. Be fair and thorough in your evaluation. Provide constructive analysis in valid JSON format. Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. ALWAYS include a scoring_reason field focusing on answer quality and insight depth. Reward genuine understanding regardless of response length.'
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
