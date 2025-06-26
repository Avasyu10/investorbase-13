
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Enhanced helper function to clean and parse JSON from AI responses
function cleanAndParseJSON(text: string): any {
  try {
    // First attempt - try parsing as-is
    return JSON.parse(text);
  } catch (error) {
    console.log('First parse attempt failed, cleaning JSON...');
    
    // Remove markdown code blocks
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Fix common JSON issues with dollar signs and backslashes
    cleaned = cleaned
      // Fix dollar signs that are improperly escaped
      .replace(/\\?\$(\d)/g, '$$$1')  // Convert \$500 or $500 to $500
      .replace(/\\\$/g, '$')         // Convert \$ to $
      // Fix double backslashes and other escape issues
      .replace(/\\\\/g, '\\')        // Fix double escaping
      .replace(/\\'/g, "'")          // Fix escaped single quotes
      .replace(/\\"/g, '"')          // Normalize escaped double quotes
      // Fix newlines, tabs, and carriage returns
      .replace(/\\n/g, '\\n')        // Ensure newlines are properly escaped
      .replace(/\\t/g, '\\t')        // Ensure tabs are properly escaped
      .replace(/\\r/g, '\\r')        // Ensure carriage returns are properly escaped
      // Remove control characters that can break JSON
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Try to find JSON object boundaries
    const startIndex = cleaned.indexOf('{');
    const lastIndex = cleaned.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1 && startIndex < lastIndex) {
      cleaned = cleaned.substring(startIndex, lastIndex + 1);
    }
    
    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error('Second parse attempt failed:', secondError);
      console.error('Cleaned text sample:', cleaned.substring(0, 500));
      
      // Last resort: more aggressive cleaning
      try {
        // Replace problematic patterns that commonly cause issues
        const finalCleaned = cleaned
          // Fix any remaining dollar sign issues
          .replace(/\\\$([0-9])/g, '$$$$1')     // \$500 -> $500
          .replace(/\\&/g, '&')                // \& -> &
          .replace(/\\\s/g, ' ')               // \ followed by space
          // Ensure proper escaping of actual newlines in the text
          .replace(/\n/g, '\\n')               // Actual newlines to escaped
          .replace(/\r/g, '\\r')               // Actual carriage returns to escaped
          .replace(/\t/g, '\\t')               // Actual tabs to escaped
          // Remove any remaining problematic sequences
          .replace(/\\([^"\\\/bfnrt])/g, '$1'); // Remove invalid escape sequences
          
        return JSON.parse(finalCleaned);
      } catch (finalError) {
        console.error('Final parse attempt failed:', finalError);
        console.error('Final cleaned text sample:', cleaned.substring(0, 200));
        throw new Error(`Could not parse JSON response: ${finalError.message}`);
      }
    }
  }
}

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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGeminiKey: !!geminiApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error('Required environment variables are missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the submission with a single retry if not found
    console.log('Fetching submission...');
    let submission = null;
    
    const { data, error } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (error) {
      console.error('Database error fetching submission:', error);
      throw new Error(`Failed to fetch submission: ${error.message}`);
    }

    if (!data) {
      // Single retry after 1 second if not found
      console.log('Submission not found, retrying once after 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: retryData, error: retryError } = await supabase
        .from('eureka_form_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();

      if (retryError) {
        console.error('Retry database error:', retryError);
        throw new Error(`Failed to fetch submission on retry: ${retryError.message}`);
      }

      if (!retryData) {
        console.error(`Submission ${submissionId} not found in database`);
        throw new Error(`Submission not found: ${submissionId}`);
      }

      submission = retryData;
    } else {
      submission = data;
    }

    console.log('Successfully fetched submission:', {
      id: submission.id,
      company_name: submission.company_name,
      analysis_status: submission.analysis_status
    });

    // Check if already analyzing or completed
    if (submission.analysis_status === 'completed') {
      console.log('Submission already analyzed');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Submission already analyzed',
          submissionId,
          companyId: submission.company_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use the specific user ID for all Eureka form submissions
    const effectiveUserId = "ba8610ea-1e0c-49f9-ae5a-86aae1f6d1af";
    console.log('Using fixed user ID for company creation:', effectiveUserId);

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

    // Check if answers are empty or minimal for strict scoring
    const checkIfAnswerIsEmpty = (answer: string | null | undefined): boolean => {
      if (!answer) return true;
      const trimmed = answer.trim();
      return trimmed.length === 0 || trimmed.length < 10; // Less than 10 characters considered empty/minimal
    };

    const emptyAnswerCount = [
      submission.question_1,
      submission.question_2, 
      submission.question_3,
      submission.question_4,
      submission.question_5
    ].filter(checkIfAnswerIsEmpty).length;

    const hasMinimalAnswers = emptyAnswerCount >= 3; // If 3 or more answers are empty/minimal

    // Build analysis prompt with submission data - Enhanced for IIT Bombay users
    const analysisPrompt = `
    You are an expert startup evaluator with STRICT AND RIGOROUS SCORING STANDARDS for IIT Bombay's startup evaluation program. Your scoring must be EVIDENCE-BASED and reflect the actual quality and depth of responses provided.

    CRITICAL JSON FORMATTING REQUIREMENTS:
    - You MUST return ONLY valid JSON with no markdown formatting, code blocks, or additional text
    - Use simple quotes and avoid complex escape sequences
    - When mentioning dollar amounts, use "USD" instead of the dollar symbol
    - When mentioning percentages, write them as "8-10 percent" instead of using % symbol
    - Avoid using ampersand (&) symbols - write "and" instead
    - No backticks, no explanatory text - just pure JSON

    IMPORTANT: You MUST incorporate real market data, numbers, and industry statistics in your analysis. Reference actual market sizes (in billions USD), growth rates (as percentages written as "percent"), funding rounds, competitor valuations, and industry benchmarks whenever possible. All strengths and weaknesses must include specific market data and numbers.

    EMPTY FORM DETECTION: This submission has ${emptyAnswerCount} out of 5 questions with empty or minimal answers (less than 10 characters). ${hasMinimalAnswers ? 'This indicates a low-effort submission that should receive very low scores.' : 'This has some substantial content that can be evaluated.'}

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and STRICT EVALUATION METRICS:

    1. PROBLEM AND SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Rate this section from 0-100 based on these STRICT criteria:
    - Clear problem identification (25 points): Must identify SPECIFIC, VALIDATED problems with evidence
    - Solution viability (25 points): Solution must logically and effectively address the identified problem
    - Market validation (25 points): Must show evidence of market research, customer interviews, or validation
    - Innovation level (25 points): Must demonstrate clear differentiation and novel approach
    
    SCORING RULES: Empty/minimal responses (under 10 chars) = 0-15 points. Generic responses without specifics = 15-35 points. Detailed responses with examples = 35-70 points. Exceptional responses with validation = 70-100 points.

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Rate this section from 0-100 based on these STRICT criteria:
    - Customer segmentation specificity (30 points): Must define SPECIFIC customer segments with demographics/characteristics
    - Market size quantification (25 points): Must provide actual market size data and addressable market estimates
    - Customer pain validation (25 points): Must show evidence of understanding actual customer pain points through research
    - Go-to-market strategy (20 points): Must outline realistic, specific customer acquisition strategies
    
    SCORING RULES: Empty/minimal responses = 0-15 points. Vague customer descriptions = 15-35 points. Specific segments with some data = 35-70 points. Detailed segments with market research = 70-100 points.

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Rate this section from 0-100 based on these STRICT criteria:
    - Competitive landscape awareness (35 points): Must identify SPECIFIC competitors with detailed analysis
    - Differentiation strategy (30 points): Must clearly articulate unique value proposition vs competitors
    - Competitive analysis depth (20 points): Must analyze competitor strengths, weaknesses, and market positioning
    - Market positioning clarity (15 points): Must explain how they position differently in the market
    
    SCORING RULES: Empty/minimal responses = 0-15 points. Generic competitor mentions = 15-35 points. Specific competitors with basic analysis = 35-70 points. Detailed competitive analysis with positioning = 70-100 points.

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    Rate this section from 0-100 based on these STRICT criteria:
    - Revenue stream clarity (30 points): Must clearly explain HOW they generate revenue with specific mechanisms
    - Pricing strategy justification (25 points): Must provide pricing with market-based justification
    - Financial projections realism (25 points): Must include realistic financial expectations with assumptions
    - Scalability demonstration (20 points): Must explain how the revenue model scales with growth
    
    SCORING RULES: Empty/minimal responses = 0-15 points. Basic revenue mentions without details = 15-35 points. Clear revenue model with some projections = 35-70 points. Detailed model with market-based pricing = 70-100 points.

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Rate this section from 0-100 based on these STRICT criteria:
    - Unique value proposition clarity (35 points): Must articulate CLEAR, SPECIFIC unique advantages
    - Sustainable competitive advantages (25 points): Must identify defensible competitive moats
    - Innovation factor demonstration (25 points): Must show genuine innovation in technology, approach, or business model
    - Market opportunity alignment (15 points): Must connect differentiation to specific market opportunities
    
    SCORING RULES: Empty/minimal responses = 0-15 points. Generic differentiation claims = 15-35 points. Specific advantages with some evidence = 35-70 points. Strong differentiation with clear moats = 70-100 points.

    STRICT SCORING REQUIREMENTS FOR IIT BOMBAY:

    1. EVIDENCE-BASED SCORING: Scores must reflect actual content quality, depth, and evidence provided
    2. EMPTY RESPONSES PENALTY: Empty or minimal responses (under 10 characters) should score 0-15 points maximum
    3. NO GRADE INFLATION: Do not give high scores for generic or unsupported claims
    4. OVERALL SCORE = (PROBLEM_SOLUTION × 0.25) + (TARGET_CUSTOMERS × 0.25) + (COMPETITORS × 0.20) + (REVENUE_MODEL × 0.15) + (DIFFERENTIATION × 0.15)

    RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 75 (exceptional applications with strong evidence and detailed responses)
    - Consider: Overall score 50-74 (solid applications with good potential but some gaps)
    - Reject: Overall score < 50 (applications with significant gaps or minimal effort)

    MANDATORY MARKET DATA REQUIREMENTS FOR ALL ANALYSES:
    - Include actual market size figures in billions or millions USD for the industry
    - Reference real growth rates and industry trends using percentages written as "percent"
    - Mention specific competitor companies and their valuations/funding when possible
    - Include funding data for similar companies in the space (Series A, B, etc. amounts)
    - Use actual industry statistics and benchmarks from credible sources
    - Reference real market research data and analyst reports

    CRITICAL: You MUST provide a "scoring_reason" that is SHORT AND COMPACT (maximum 2-3 sentences) explaining the overall score based on content quality and evidence level.

    CRITICAL: ALL strengths and weaknesses MUST include specific market data, competitor information, industry benchmarks, and quantified metrics. No generic statements allowed.

    CRITICAL ASSESSMENT POINTS REQUIREMENTS:
    - Each assessment point MUST be a complete, detailed sentence with specific market data and numbers
    - Include market size in billions USD, growth rates as percentages, competitor valuations, funding amounts
    - Reference specific companies, their funding rounds, market share data
    - Include customer acquisition costs, lifetime values, market penetration rates
    - Mention industry benchmarks, pricing data, and market positioning metrics
    - NO single words or generic phrases - each point must be comprehensive and data-driven

    WEAKNESSES REQUIREMENTS:
    - Weaknesses MUST be based on market realities and competitive landscape analysis
    - Focus on market challenges, competitive threats, industry dynamics, economic factors
    - Include specific market data, competitor advantages, industry trends that pose challenges
    - Reference actual market conditions, regulatory challenges, economic factors
    - DO NOT mention what the form is missing or lacks - focus on market-based challenges
    - Each weakness must include quantified market data and industry benchmarks

    Return ONLY this JSON structure with no additional text, markdown, or formatting:
    {
      "overall_score": 35,
      "scoring_reason": "Short, compact 2-3 sentence explanation of score based on actual content quality and evidence provided.",
      "recommendation": "Consider",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description WITH MARKET CONTEXT and industry statistics)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": 35,
          "analysis": "Evidence-based analysis highlighting specific content quality WITH MARKET SIZE DATA and industry growth statistics",
          "strengths": ["2-3 specific strengths with REAL MARKET NUMBERS, competitor valuations, and industry benchmarks"],
          "improvements": ["3-4 market-based challenges with SPECIFIC MARKET DATA including competitor advantages, market dynamics, industry trends that create challenges, economic factors, and regulatory hurdles - each with quantified metrics and industry benchmarks"]
        },
        "target_customers": {
          "score": 35,
          "analysis": "Evidence-based analysis of customer understanding WITH MARKET SIZING DATA and customer acquisition costs",
          "strengths": ["2-3 specific strengths with CUSTOMER SEGMENT SIZES, market penetration rates, and acquisition benchmarks"],
          "improvements": ["3-4 market-based customer challenges with SPECIFIC DATA including market saturation rates, customer acquisition costs in the industry, competitive customer retention metrics, and market dynamics affecting customer segments"]
        },
        "competitors": {
          "score": 35,
          "analysis": "Evidence-based analysis of competitive understanding WITH COMPETITOR VALUATIONS and market share data",
          "strengths": ["2-3 specific strengths with COMPETITIVE MARKET SHARE DATA, competitor funding amounts, and positioning analysis"],
          "improvements": ["3-4 competitive market challenges with SPECIFIC DATA including dominant competitor market shares, competitor funding advantages, market positioning challenges, and competitive dynamics that create barriers"]
        },
        "revenue_model": {
          "score": 35,
          "analysis": "Evidence-based analysis of revenue strategy WITH INDUSTRY PRICING DATA and revenue benchmarks",
          "strengths": ["2-3 specific strengths with REVENUE BENCHMARKS, pricing comparisons, and industry monetization data"],
          "improvements": ["3-4 revenue model challenges based on MARKET DATA including industry pricing pressures, market monetization challenges, competitive pricing advantages, and economic factors affecting revenue generation"]
        },
        "differentiation": {
          "score": 35,
          "analysis": "Evidence-based analysis of differentiation WITH MARKET POSITIONING DATA and innovation metrics",
          "strengths": ["2-3 specific strengths with INNOVATION METRICS, patent data, and differentiation benchmarks"],
          "improvements": ["3-4 differentiation challenges with MARKET DATA including competitive innovation rates, market commoditization trends, technology adoption barriers, and industry factors that limit differentiation advantages"]
        }
      },
      "summary": {
        "overall_feedback": "Comprehensive evidence-based feedback WITH MARKET CONTEXT and industry benchmarks",
        "key_factors": ["Key success factors with INDUSTRY DATA and market statistics"],
        "next_steps": ["Specific recommendations with MARKET-BASED TARGETS and industry benchmarks"],
        "assessment_points": [
          "The global SaaS market is valued at approximately 273 billion USD as of 2025 with an annual growth rate of 13.7 percent, indicating strong market potential for software solutions targeting enterprise customers",
          "Customer acquisition costs in the SaaS industry average between 200-500 USD per customer depending on the segment, with enterprise customers requiring 1000-3000 USD investment for successful acquisition",
          "Leading competitors like Salesforce (market cap 285 billion USD) and Microsoft (market cap 3.2 trillion USD) dominate with 19.8 percent and 14.2 percent market share respectively in the CRM space",
          "Series A funding rounds in SaaS companies average 15-25 million USD with typical valuations of 50-100 million USD for companies showing 2-5 million USD annual recurring revenue",
          "Customer lifetime value in B2B SaaS averages 3-5 times the customer acquisition cost, with successful companies achieving LTV/CAC ratios above 3:1 within 12-18 months",
          "Market penetration in enterprise software segments typically ranges from 15-25 percent for established players, with new entrants achieving 1-3 percent market share within first 3 years",
          "Industry pricing benchmarks show per-user monthly costs ranging from 10-100 USD for basic solutions to 200-500 USD for enterprise-grade platforms with advanced features",
          "Competitive analysis reveals funding disparities where established players raised 100+ million USD in growth capital while emerging startups secure 5-15 million USD in early-stage funding",
          "Market research indicates 65-75 percent of enterprises evaluate 3-5 competing solutions before purchase decisions, with evaluation cycles lasting 6-12 months for enterprise deals",
          "Revenue growth rates for successful SaaS companies typically achieve 100+ percent year-over-year growth in early stages, declining to 30-50 percent growth as they scale beyond 10 million USD ARR"
        ]
      }
    }

    CRITICAL: Every analysis section MUST be evidence-based, reflecting the actual quality and depth of responses provided. Empty or minimal responses must be scored accordingly (0-15 points). All "improvements" sections must focus on market-based challenges with quantified data and industry benchmarks - NOT on what the form is missing.

    IMPORTANT: Scoring must be STRICT and EVIDENCE-BASED. Do not inflate scores. Base all evaluations on actual content provided and its quality, depth, and evidence level. ALL market data, competitor information, and industry statistics must be SPECIFIC and QUANTIFIED. Assessment points must be comprehensive sentences with detailed market data and numbers.

    ${linkedInDataSection}
    `;

    // Call Gemini API for analysis
    console.log('Calling Gemini API for analysis...');
    
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.1,
          maxOutputTokens: 4000,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received, parsing...');

    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini');
    }

    let analysisText = geminiData.candidates[0].content.parts[0].text;
    console.log('Raw analysis text received from Gemini');
    console.log('Analysis text sample:', analysisText.substring(0, 200) + '...');

    let analysisResult;
    try {
      analysisResult = cleanAndParseJSON(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Full analysis text:', analysisText);
      throw new Error(`Analysis response was not valid JSON: ${parseError.message}`);
    }

    console.log('Analysis overall score:', analysisResult.overall_score);
    console.log('Analysis recommendation:', analysisResult.recommendation);

    // Create or update company
    let companyId = submission.company_id;
    let isNewCompany = false;

    if (!companyId) {
      console.log('Creating NEW company for analyzed submission...');
      isNewCompany = true;
      
      const companyData = {
        name: submission.company_name,
        overall_score: analysisResult.overall_score,
        scoring_reason: analysisResult.scoring_reason || '',
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

      companyId = newCompany.id;
      console.log('Successfully created NEW company with ID:', companyId);
    } else {
      console.log('Updating existing company...');
      
      const updateData = {
        overall_score: analysisResult.overall_score,
        scoring_reason: analysisResult.scoring_reason || '',
        assessment_points: analysisResult.summary?.assessment_points || [],
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

    // Create sections with correct IIT Bombay section mapping
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

    // Map the sections to the correct IIT Bombay structure
    const sectionMapping = {
      'problem_solution_fit': 'Problem & Solution',
      'target_customers': 'Target Customers', 
      'competitors': 'Competitors',
      'revenue_model': 'Revenue Model',
      'differentiation': 'Differentiation'
    };

    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionKey, sectionData]: [string, any]) => ({
      company_id: companyId,
      score: sectionData.score || 0,
      section_type: sectionKey,
      type: 'analysis',
      title: sectionMapping[sectionKey as keyof typeof sectionMapping] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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
    const { error: finalUpdateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        company_id: companyId
      })
      .eq('id', submissionId);

    if (finalUpdateError) {
      console.error('Failed to update submission:', finalUpdateError);
      throw new Error(`Failed to update submission: ${finalUpdateError.message}`);
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
