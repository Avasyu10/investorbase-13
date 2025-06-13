
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
      analysis_status: submission.analysis_status,
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
      // Check current status and return accordingly
      const { data: currentSubmission } = await supabase
        .from('barc_form_submissions')
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

    // Fetch LinkedIn profile data if founder profiles exist
    const hasLinkedInData = submission.founder_linkedin_urls && submission.founder_linkedin_urls.length > 0;
    let linkedInDataSection = '';
    let founderLinkedInData = [];

    if (hasLinkedInData && submission.founder_linkedin_urls.some(url => url.trim())) {
      console.log('Fetching LinkedIn profile data for founders...');
      
      // Get LinkedIn scrape data for the founders
      const validLinkedInUrls = submission.founder_linkedin_urls.filter(url => url.trim());
      
      for (const url of validLinkedInUrls) {
        try {
          const { data: linkedinData, error: linkedinError } = await supabase
            .from('linkedin_scrapes')
            .select('*')
            .eq('linkedin_url', url.trim())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!linkedinError && linkedinData) {
            founderLinkedInData.push({
              url: url.trim(),
              name: linkedinData.name || 'Founder',
              headline: linkedinData.headline || '',
              summary: linkedinData.summary || '',
              experience: linkedinData.experience || [],
              education: linkedinData.education || [],
              skills: linkedinData.skills || []
            });
          }
        } catch (error) {
          console.error(`Error fetching LinkedIn data for ${url}:`, error);
        }
      }

      if (founderLinkedInData.length > 0) {
        linkedInDataSection = `

    Founder LinkedIn Profile Data:
    ${founderLinkedInData.map((founder, index) => `
    Founder ${index + 1} - ${founder.name}:
    - LinkedIn URL: ${founder.url}
    - Current Role: ${founder.headline}
    - Professional Summary: ${founder.summary}
    - Recent Experience: ${founder.experience.slice(0, 3).map(exp => `${exp.title} at ${exp.company} (${exp.duration})`).join(', ')}
    - Education: ${founder.education.slice(0, 2).map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}
    - Key Skills: ${founder.skills.slice(0, 10).join(', ')}
    `).join('\n')}
    `;
      } else {
        linkedInDataSection = `

    Founder LinkedIn Profile Data:
    ${submission.founder_linkedin_urls.filter(url => url.trim()).map((url, index) => `
    Profile ${index + 1}: ${url}
    - Analysis: Based on the LinkedIn URL provided, this appears to be a founder/co-founder profile that should be analyzed for relevant experience and background in relation to the startup.`).join('\n')}
    `;
      }
    }

    // Call OpenAI for analysis
    console.log('Calling OpenAI API for enhanced metrics-based analysis...');
    
    const analysisPrompt = `
    You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.industry || 'Not provided'}
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
        "market_opportunity": {
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
        "team_strength": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context",
          "strengths": [${founderLinkedInData.length > 0 ? `"CRITICAL: Start with founder LinkedIn insights in this EXACT format for each founder: 'Founder Name: his/her relevant experience or achievement', then add 3-4 additional strengths with market data integration"` : `"exactly 4-5 strengths with market data integration - include LinkedIn founder insights if available"`}],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "execution_plan": {
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
            content: 'You are an expert startup evaluator for IIT Bombay. Provide thorough, constructive analysis in valid JSON format with specific market metrics and data points. IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.'
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

    let analysisText = openaiData.choices[0].message.content;
    console.log('Raw analysis text received from OpenAI');

    // Clean up the response text to extract JSON from markdown code blocks if present
    analysisText = analysisText.trim();
    
    // Remove markdown code blocks if present
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Trim any remaining whitespace
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

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: submission.company_name,
          overall_score: analysisResult.overall_score,
          assessment_points: analysisResult.summary?.assessment_points || [],
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

    // Create sections with proper data structure
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

    // Also delete old section details
    const { error: deleteDetailsError } = await supabase
      .from('section_details')
      .delete()
      .in('section_id', []);

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

      // Now create section details (strengths and weaknesses) for each section
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
