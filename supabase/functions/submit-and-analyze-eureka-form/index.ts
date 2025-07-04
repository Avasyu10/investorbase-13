import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};
// Enhanced helper function to clean and parse JSON from AI responses
function cleanAndParseJSON(text) {
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
    cleaned = cleaned // Fix dollar signs that are improperly escaped
    .replace(/\\?\$(\d)/g, '$$$1') // Convert \$500 or $500 to $500
    .replace(/\\\$/g, '$') // Convert \$ to $
    // Fix double backslashes and other escape issues
    .replace(/\\\\/g, '\\') // Fix double escaping
    .replace(/\\'/g, "'") // Fix escaped single quotes
    .replace(/\\"/g, '"') // Normalize escaped double quotes
    // Fix newlines, tabs, and carriage returns
    .replace(/\\n/g, '\\n') // Ensure newlines are properly escaped
    .replace(/\\t/g, '\\t') // Ensure tabs are properly escaped
    .replace(/\\r/g, '\\r') // Ensure carriage returns are properly escaped
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
        const finalCleaned = cleaned // Fix any remaining dollar sign issues
        .replace(/\\\$([0-9])/g, '$$$$1') // \$500 -> $500
        .replace(/\\&/g, '&') // \& -> &
        .replace(/\\\s/g, ' ') // \ followed by space
        // Ensure proper escaping of actual newlines in the text
        .replace(/\n/g, '\\n') // Actual newlines to escaped
        .replace(/\r/g, '\\r') // Actual carriage returns to escaped
        .replace(/\t/g, '\\t') // Actual tabs to escaped
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
serve(async (req)=>{
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
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  let submissionId = null;
  try {
    const requestBody = await req.json();
    console.log('Received Eureka form submission:', requestBody);
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
    // Use the specific user ID for all Eureka form submissions
    const effectiveUserId = "2c1d5fc8-c1d2-4229-a36e-6f1d211562aa";
    // Prepare submission data with all form fields
    const submissionData = {
      form_slug: requestBody.form_slug || 'eureka-form',
      company_name: requestBody.company_name || '',
      company_registration_type: requestBody.company_registration_type || null,
      executive_summary: requestBody.executive_summary || null,
      company_type: requestBody.company_type || null,
      question_1: requestBody.answer_1 || null,
      question_2: requestBody.answer_2 || null,
      question_3: requestBody.answer_3 || null,
      question_4: requestBody.answer_4 || null,
      question_5: requestBody.answer_5 || null,
      question_6: requestBody.answer_6 || null,
      question_7: requestBody.answer_7 || null,
      question_8: requestBody.answer_8 || null,
      question_9: requestBody.answer_9 || null,
      submitter_email: requestBody.submitter_email || '',
      founder_linkedin_urls: requestBody.founder_linkedin_urls || [],
      poc_name: requestBody.poc_name || null,
      phoneno: requestBody.phoneno || null,
      company_linkedin_url: requestBody.company_linkedin_url || null,
      idea_id: requestBody.idea_id || null,
      eureka_id: requestBody.eureka_id || null,
      user_id: effectiveUserId,
      analysis_status: 'processing'
    };
    console.log('Inserting submission data:', submissionData);
    // Insert the submission
    const { data: submission, error: insertError } = await supabase.from('eureka_form_submissions').insert([
      submissionData
    ]).select().single();
    if (insertError) {
      console.error('Error inserting submission:', insertError);
      throw new Error(`Failed to insert submission: ${insertError.message}`);
    }
    if (!submission) {
      throw new Error('No submission data returned from database');
    }
    submissionId = submission.id;
    console.log('Successfully inserted submission:', submission.id);
    // Process LinkedIn data for team analysis
    const founderLinkedInData = [];
    if (submission.founder_linkedin_urls && Array.isArray(submission.founder_linkedin_urls)) {
      for (const url of submission.founder_linkedin_urls){
        if (url && typeof url === 'string' && url.trim()) {
          try {
            const { data: linkedInData } = await supabase.from('linkedin_profile_scrapes').select('content').eq('url', url.trim()).order('created_at', {
              ascending: false
            }).limit(1).maybeSingle();
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
    const linkedInDataSection = founderLinkedInData.length > 0 ? `\n\nFounder LinkedIn Data:\n${founderLinkedInData.map((data, index)=>`Founder ${index + 1} LinkedIn (${data.url}):\n${data.content}`).join('\n\n')}` : '\n\nNo LinkedIn data available for founders.';
    // Check if answers are empty or minimal for strict scoring
    const checkIfAnswerIsEmpty = (answer)=>{
      if (!answer) return true;
      const trimmed = answer.trim();
      return trimmed.length === 0 || trimmed.length < 10;
    };
    const emptyAnswerCount = [
      submission.question_1,
      submission.question_2,
      submission.question_3,
      submission.question_4,
      submission.question_5,
      submission.question_6,
      submission.question_7,
      submission.question_8,
      submission.question_9
    ].filter(checkIfAnswerIsEmpty).length;
    const hasMinimalAnswers = emptyAnswerCount >= 3;
    // Build analysis prompt with submission data
    // ... (previous code)
    // Build analysis prompt with submission data
    const analysisPrompt = `
    You are an expert startup evaluator. Analyze the following startup application and provide a comprehensive assessment.

    Company Information:
    - Company Name: ${submission.eureka_id || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}
    - Idea ID: ${submission.idea_id || 'Not provided'}
    - Eureka ID: ${submission.eureka_id || 'Not provided'}

    Application Responses and Specific Metrics for Evaluation:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Problem Clarity (30 pts): Is it real, urgent, and well-articulated with specific details?
    - Current Alternatives (30 pts): Are existing coping methods explained clearly with depth?
    - Solution Fit (30 pts): Is the solution directly tackling the core pain point with thoughtful reasoning?
    
    Score harshly if: Problem is vague or generic, no insight into how people cope, unclear connection between problem and solution, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Clear, urgent pain point + solid understanding of alternatives + compelling solution match + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    2. TARGET CUSTOMERS: "${submission.question_3 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Customer Definition (35 pts): Are the segments specific and realistic with detailed descriptions?
    - Use Case Relevance (35 pts): Does the product clearly serve these users with specific examples?
    - Depth of Understanding (30 pts): Shows behavioral, demographic, or need-based insight with evidence?
    
    Score harshly if: Describes "everyone" or is overly broad, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Defined personas, nuanced insights, matched offering + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    3. COMPETITORS: "${submission.question_4 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Competitor Awareness (35 pts): Are both direct and indirect players mentioned with specific names and details?
    - Comparison Clarity (35 pts): Is differentiation from competitors clear with specific comparisons?
    - Strategic Positioning (30 pts): Do they show where they fit in the landscape with thoughtful analysis?
    
    Score harshly if: Misses obvious competitors or gives vague comparisons, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Deep landscape awareness and sharp positioning + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    4. REVENUE MODEL: "${submission.question_5 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Monetization Clarity (30 pts): Is revenue generation clearly explained with specific mechanisms?
    - Cost/Revenue Drivers (35 pts): Are cost factors and revenue influencers identified with details?
    - Scalability & Growth (35 pts): Is there a future roadmap for expansion with concrete plans?
    
    Score harshly if: No revenue clarity or hand-wavy growth claims, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Structured, feasible model + strong growth potential + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    5. DIFFERENTIATION: "${submission.question_6 || 'Not provided'}"
    
    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - USP Clarity (30 pts): Clear, strong differentiator from others with specific advantages?
    - Customer Pull Strategy (35 pts): Effective tactics to attract and retain users with detailed plans?
    - IP or Moat (35 pts): Any defensibility—tech, brand, data, or network effects with specifics?
    
    Score harshly if: No meaningful edge, or vague marketing, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Compelling USP + solid GTM + proprietary advantage + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).
    
    6. PROTOTYPE: "${submission.question_8 || 'Not provided'}"

    Evaluate using these EXACT metrics (score each 1-100, be EXTREMELY discriminative based on ANSWER QUALITY AND DEPTH):
    - Maturity & Description Credibility (40 pts): Is the claimed prototype stage clearly defined, and is its description detailed, consistent, and credible (e.g., features, tech stack)?
    - Problem-Solution Fit & User Validation (30 pts): Does the prototype clearly address the core problem, and is there evidence of external usage or stakeholder validation (e.g., user feedback, pilot programs)?
    - Feasibility & Future Development (30 pts): Is the further development of the prototype into a full product feasible, realistic, and are the next steps clearly defined?

    Score harshly if: No clear description of prototype, no mention of user testing or feedback, technical aspects are vague, ONE-WORD OR VERY SHORT ANSWERS (under 10 words should score 5-15 MAXIMUM).
    Score highly if: Detailed description of a functional prototype, clear evidence of user validation and iterative improvements, well-thought-out technical foundation and scalability plans + DETAILED EXPLANATIONS (over 100 words with specifics should score 80-100).

    CRITICAL SCORING GUIDELINES - BE EXTREMELY HARSH ON POOR ANSWERS:

    ANSWER LENGTH AND QUALITY REQUIREMENTS (THESE ARE HARD LIMITS):
    - ONE-WORD ANSWERS OR UNDER 5 WORDS: Score 5-15 MAXIMUM (regardless of market potential)
    - UNDER 10 WORDS: Score 5-20 MAXIMUM (regardless of market potential)
    - UNDER 20 WORDS: Score 10-30 MAXIMUM (regardless of market potential)
    - UNDER 50 WORDS: Score 15-45 MAXIMUM (rarely above 40)
    - 50-100 WORDS: Can score up to 60-70 if high quality
    - 100+ WORDS with specifics: Can score 70-85
    - 150+ WORDS with comprehensive analysis: Can score 80-95
    - 200+ WORDS with exceptional depth: Can score 90-100

    ANSWER QUALITY IS THE PRIMARY FACTOR - Market data should only be used as context, NOT to inflate scores for poor answers.

    90-100: Exceptional responses with deep insights, clear evidence, comprehensive understanding, DETAILED RESPONSES (150+ words with specific examples, data, and thorough explanations)
    80-89: Strong responses with good evidence and understanding, minor gaps, GOOD DETAIL (100-150 words with some specifics)
    70-79: Adequate responses with some evidence, moderate understanding, MODERATE DETAIL (50-100 words)
    60-69: Weak responses with limited evidence, significant gaps, BRIEF RESPONSES (20-50 words)
    40-59: Poor responses with minimal substance, major deficiencies, VERY SHORT (10-20 words)
    20-39: Very poor responses, largely inadequate or missing key elements, EXTREMELY SHORT (5-10 words)
    1-19: Extremely poor or non-responses, ONE-WORD ANSWERS OR MEANINGLESS TEXT (under 5 words)

    MARKET INTEGRATION REQUIREMENT:
    For each section, integrate relevant market data including: market size figures, growth rates, customer acquisition costs, competitive landscape data, industry benchmarks, success rates, and financial metrics. Balance response quality assessment with market context. However, POOR ANSWER QUALITY CANNOT BE COMPENSATED BY GOOD MARKET DATA.

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

    CRITICAL ADDITION - SCORING REASON REQUIREMENT:
    Generate a brief 1-2 sentence explanation for the overall score that summarizes the key factors that led to this rating. This should be concise but specific about what drove the score up or down.

    Return ONLY valid JSON in this exact format:
    {
      "overall_score": number (1-100),
      "scoring_reason": "Brief 1-2 sentence explanation of the key factors that determined this overall score",
      "recommendation": "Accept" | "Consider" | "Reject",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "target_customers": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "competitors": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "revenue_model": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "differentiation": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
          "strengths": ["exactly 4-5 strengths with market data integration"],
          "improvements": ["exactly 4-5 market data weaknesses/challenges the company faces in this industry - NOT response quality issues"]
        },
        "prototype": {
          "score": number (1-100),
          "analysis": "detailed analysis evaluating response quality against the 3 specific metrics with market context. first point should be why that score was given with 1-2 sentence detailed explanation and if needed use market data.",
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
          "Provide detailed analysis of how their solution fits within current market conditions and future projections"
        ]
      }
    }

    CRITICAL REQUIREMENTS:
    1. ANSWER QUALITY IS THE PRIMARY SCORING FACTOR - poor answers cannot be saved by market potential
    2. CREATE SIGNIFICANT SCORE DIFFERENCES - excellent detailed responses (80-100), poor short responses (5-30)
    3. Use the exact metrics provided for each question in your evaluation
    4. HEAVILY PENALIZE SHORT, SUPERFICIAL ANSWERS - follow the strict word count limits above
    5. REWARD DETAILED, THOUGHTFUL RESPONSES - comprehensive answers with specifics should score 80-100
    6. ASSESSMENT POINTS: Each of the 8-10 points must be heavily weighted toward market data, numbers, and quantifiable metrics with 3-4 sentences each
    7. Focus weaknesses ONLY on market data challenges and industry risks - NOT response quality or form gaps
    8. Provide exactly 4-5 strengths and 4-5 weaknesses per section
    9. All scores must be 1-100 scale
    10. Return only valid JSON without markdown formatting
    11. MOST IMPORTANT: Poor answer quality (short, vague, one-word answers) CANNOT be compensated by good market analysis
    12. MUST include scoring_reason field with brief 1-2 sentence justification for overall score
    13. WEAKNESSES MUST FOCUS EXCLUSIVELY ON EXTERNAL MARKET CONDITIONS WITH DETAILED ANALYSIS
    ${linkedInDataSection} <--- THIS IS WHERE IT SHOULD BE
    `;
    // ... (rest of your code)
    // Call Gemini API for analysis
    console.log('Calling Gemini API for analysis...');
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: analysisPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000
        }
      })
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
    let analysisResult;
    try {
      analysisResult = cleanAndParseJSON(analysisText);
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
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
        name: submission.eureka_id,
        overall_score: analysisResult.overall_score,
        scoring_reason: submission.question_7 || '',
        assessment_points: analysisResult.summary?.assessment_points || [],
        user_id: effectiveUserId,
        source: 'eureka_form',
        industry: submission.question_2 || null,
        email: submission.submitter_email || null,
        poc_name: submission.poc_name || null,
        phonenumber: submission.phoneno || null
      };
      console.log('Company data to insert:', companyData);
      const { data: newCompany, error: companyError } = await supabase.from('companies').insert(companyData).select().single();
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
      const { error: updateCompanyError } = await supabase.from('companies').update(updateData).eq('id', companyId);
      if (updateCompanyError) {
        console.error('Error updating company:', updateCompanyError);
        throw new Error(`Failed to update company: ${updateCompanyError.message}`);
      }
      console.log('Successfully updated existing company with ID:', companyId);
    }
    // Create sections with correct IIT Bombay section mapping
    console.log('Creating sections for company:', companyId);
    // Delete old sections first
    const { error: deleteError } = await supabase.from('sections').delete().eq('company_id', companyId);
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
    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionKey, sectionData])=>({
        company_id: companyId,
        score: sectionData.score || 0,
        section_type: sectionKey,
        type: 'analysis',
        title: sectionMapping[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase()),
        description: sectionData.analysis || ''
      }));
    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase.from('sections').insert(sectionsToCreate).select();
      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }
      console.log('Created sections:', sectionsToCreate.length);
      // Create section details (strengths and weaknesses)
      const sectionDetails = [];
      for (const section of createdSections){
        const sectionKey = section.section_type;
        const sectionData = analysisResult.sections[sectionKey];
        if (sectionData) {
          // Add strengths
          if (sectionData.strengths && Array.isArray(sectionData.strengths)) {
            for (const strength of sectionData.strengths){
              sectionDetails.push({
                section_id: section.id,
                detail_type: 'strength',
                content: strength
              });
            }
          }
          // Add improvements (weaknesses)
          if (sectionData.improvements && Array.isArray(sectionData.improvements)) {
            for (const improvement of sectionData.improvements){
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
        const { error: detailsError } = await supabase.from('section_details').insert(sectionDetails);
        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }
        console.log('Created section details:', sectionDetails.length);
      }
    }
    // Update submission with final results
    console.log('Updating submission with final analysis results...');
    const { error: finalUpdateError } = await supabase.from('eureka_form_submissions').update({
      analysis_status: 'completed',
      analysis_result: analysisResult,
      analyzed_at: new Date().toISOString(),
      company_id: companyId
    }).eq('id', submissionId);
    if (finalUpdateError) {
      console.error('Failed to update submission:', finalUpdateError);
      throw new Error(`Failed to update submission: ${finalUpdateError.message}`);
    }
    console.log('Successfully submitted and analyzed Eureka form', submissionId, 'and', isNewCompany ? 'created' : 'updated', 'company', companyId);
    return new Response(JSON.stringify({
      success: true,
      submissionId,
      companyId,
      isNewCompany,
      analysisResult,
      message: 'Form submitted and analyzed successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in submit-and-analyze-eureka-form function:', error);
    // Update submission with error status if we have submissionId
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase.from('eureka_form_submissions').update({
            analysis_status: 'failed',
            analysis_error: error instanceof Error ? error.message : 'Unknown error'
          }).eq('id', submissionId);
          console.log('Updated submission status to failed');
        }
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
    }
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      submissionId
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
