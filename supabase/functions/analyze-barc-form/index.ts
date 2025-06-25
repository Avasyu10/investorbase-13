
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, user-agent, accept, accept-language, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

// Helper function to clean and parse JSON from AI responses
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
    
    // Fix common JSON issues
    // Replace single quotes with double quotes (but be careful not to break strings)
    // Fix escaped characters that might be malformed
    cleaned = cleaned
      .replace(/\\'/g, "'")  // Fix escaped single quotes
      .replace(/\\"/g, '"')  // Normalize escaped double quotes
      .replace(/\\\\/g, '\\') // Fix double escaping
      .replace(/\\n/g, '\\n') // Ensure newlines are properly escaped
      .replace(/\\t/g, '\\t') // Ensure tabs are properly escaped
      .replace(/\\r/g, '\\r'); // Ensure carriage returns are properly escaped
    
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
      
      // Last resort: try to extract and fix the JSON manually
      try {
        // Remove any problematic characters that might cause parsing issues
        const finalCleaned = cleaned
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n')  // Properly escape actual newlines
          .replace(/\r/g, '\\r')  // Properly escape carriage returns
          .replace(/\t/g, '\\t'); // Properly escape tabs
          
        return JSON.parse(finalCleaned);
      } catch (finalError) {
        console.error('Final parse attempt failed:', finalError);
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
      user_id: submission.user_id,
      company_type: submission.company_type,
      poc_name: submission.poc_name,
      phoneno: submission.phoneno
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

    // FIXED: Use the specific user ID for all BARC form submissions
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

    // Build analysis prompt with submission data
    const analysisPrompt = `
    You are an expert startup evaluator with BALANCED AND FAIR SCORING STANDARDS. Your goal is to evaluate startup applications fairly while providing meaningful score differentiation. Most good applications should score between 60-80, with exceptional ones reaching 80-90.

    CRITICAL REQUIREMENT: You MUST incorporate real market data, numbers, and industry statistics in your analysis. Reference actual market sizes, growth rates, funding rounds, competitor valuations, and industry benchmarks whenever possible.

    IMPORTANT: You MUST return ONLY valid JSON. Do not include any markdown formatting, code blocks, or additional text outside the JSON structure. No backticks, no explanatory text - just pure JSON.

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Responses and FAIR EVALUATION METRICS:

    1. PROBLEM & SOLUTION: "${submission.question_1 || 'Not provided'}"
    
    Rate this section from 0-100 based on these FAIR criteria:
    - Clear problem identification (25 points): Look for specific pain points and market needs
    - Solution viability (25 points): Assess if the solution logically addresses the problem
    - Market understanding (25 points): Evidence of market research and validation
    - Innovation level (25 points): How unique or differentiated the approach is
    
    Be generous with scoring - if someone provides detailed explanations with specific examples, they should score 70+ in this section.

    2. TARGET CUSTOMERS: "${submission.question_2 || 'Not provided'}"
    
    Rate this section from 0-100 based on these FAIR criteria:
    - Customer segmentation clarity (30 points): How well-defined their target customers are
    - Market size understanding (25 points): Realistic assessment of addressable market
    - Customer pain validation (25 points): Evidence of understanding customer needs
    - Go-to-market feasibility (20 points): Realistic customer acquisition strategy
    
    Reward detailed customer analysis - specific customer segments with clear characteristics should score 70+.

    3. COMPETITORS: "${submission.question_3 || 'Not provided'}"
    
    Rate this section from 0-100 based on these FAIR criteria:
    - Competitive landscape awareness (35 points): Knowledge of direct and indirect competitors
    - Differentiation strategy (30 points): Clear unique value proposition
    - Competitive analysis depth (20 points): Understanding of competitor strengths/weaknesses
    - Market positioning (15 points): How they plan to position against competition
    
    Give credit for acknowledging competition and showing differentiation - should easily score 65+ if they identify competitors and explain differences.

    4. REVENUE MODEL: "${submission.question_4 || 'Not provided'}"
   
    Rate this section from 0-100 based on these FAIR criteria:
    - Revenue stream clarity (30 points): Clear explanation of how they make money
    - Pricing strategy logic (25 points): Reasonable pricing with market justification
    - Financial projections (25 points): Realistic financial expectations
    - Scalability potential (20 points): How the model can grow over time
    
    Reward clear revenue thinking - if they explain multiple revenue streams or show market research on pricing, score 70+.

    5. DIFFERENTIATION: "${submission.question_5 || 'Not provided'}"
    
    Rate this section from 0-100 based on these FAIR criteria:
    - Unique value proposition (35 points): What makes them different from alternatives
    - Competitive advantages (25 points): Sustainable advantages they can maintain
    - Innovation factor (25 points): Technology or approach innovations
    - Market opportunity (15 points): How differentiation creates market opportunity
    
    Value creative solutions - unique approaches to known problems should score 70+, truly innovative solutions should score 80+.

    BALANCED SCORING REQUIREMENTS:

    1. BE GENEROUS WITH GOOD RESPONSES: If someone provides detailed, thoughtful answers with specific examples, they should score 70-85 in each section
    2. REWARD EFFORT AND DEPTH: Don't penalize for not having everything perfect - reward comprehensive thinking
    3. REALISTIC EXPECTATIONS: These are early-stage startups, not established companies with perfect market data
    4. OVERALL SCORE = (PROBLEM_SOLUTION × 0.25) + (TARGET_CUSTOMERS × 0.25) + (COMPETITORS × 0.20) + (REVENUE_MODEL × 0.15) + (DIFFERENTIATION × 0.15)

    RECOMMENDATION LOGIC:
    - Accept: Overall score ≥ 75 (top tier applications with strong execution potential)
    - Consider: Overall score 60-74 (solid applications with good potential)
    - Reject: Overall score < 60 (applications needing significant development)

    MANDATORY MARKET DATA REQUIREMENTS FOR STRENGTHS AND WEAKNESSES:
    - Include actual market size figures (in billions/millions USD) for the industry
    - Reference real growth rates and industry trends
    - Mention specific competitor companies and their valuations when possible
    - Include funding data for similar companies in the space
    - Use actual industry statistics and benchmarks
    - Reference real market research data and sources

    Return ONLY this JSON structure with no additional text, markdown, or formatting:
    {
      "overall_score": 75,
      "scoring_reason": "One concise sentence explaining the overall assessment WITH SPECIFIC MARKET DATA",
      "recommendation": "Accept",
      "company_info": {
        "industry": "string (infer from application)",
        "stage": "string (Idea/Prototype/Early Revenue/Growth based on responses)",
        "introduction": "string (2-3 sentence description WITH MARKET CONTEXT)"
      },
      "sections": {
        "problem_solution_fit": {
          "score": 75,
          "analysis": "Balanced analysis highlighting what they did well and areas for improvement WITH MARKET DATA",
          "strengths": ["4-5 specific strengths with detailed explanations INCLUDING REAL MARKET NUMBERS"],
          "improvements": ["4-5 market-driven improvement areas with industry benchmarks and competitive data - DO NOT mention missing form information, focus entirely on market challenges and opportunities"]
        },
        "target_customers": {
          "score": 75,
          "analysis": "Balanced analysis of their customer understanding WITH MARKET SIZING DATA",
          "strengths": ["4-5 specific strengths with detailed explanations INCLUDING CUSTOMER SEGMENT SIZES"],
          "improvements": ["4-5 market-driven improvement areas with customer acquisition benchmarks and market penetration data - focus on market challenges, not form gaps"]
        },
        "competitors": {
          "score": 75,
          "analysis": "Balanced analysis of their competitive understanding WITH COMPETITOR VALUATIONS",
          "strengths": ["4-5 specific strengths with detailed explanations INCLUDING COMPETITIVE MARKET SHARE DATA"],
          "improvements": ["4-5 market-driven improvement areas with competitor analysis and market positioning insights - focus on competitive challenges, not missing information"]
        },
        "revenue_model": {
          "score": 75,
          "analysis": "Balanced analysis of their revenue strategy WITH INDUSTRY PRICING DATA",
          "strengths": ["4-5 specific strengths with detailed explanations INCLUDING REVENUE BENCHMARKS"],
          "improvements": ["4-5 market-driven improvement areas with pricing strategy insights and revenue optimization based on industry data - focus on market dynamics, not missing details"]
        },
        "differentiation": {
          "score": 75,
          "analysis": "Balanced analysis of their differentiation strategy WITH MARKET POSITIONING DATA",
          "strengths": ["4-5 specific strengths with detailed explanations INCLUDING INNOVATION METRICS"],
          "improvements": ["4-5 market-driven improvement areas with innovation benchmarks and market gap analysis - focus on market opportunities and challenges, not form completeness"]
        }
      },
      "summary": {
        "overall_feedback": "Comprehensive feedback focusing on strengths and growth opportunities WITH MARKET CONTEXT",
        "key_factors": ["Key success factors and potential challenges WITH INDUSTRY DATA"],
        "next_steps": ["Specific recommendations for next steps WITH MARKET-BASED GUIDANCE"],
        "assessment_points": [
          "8-10 detailed assessment points combining market analysis with startup evaluation",
          "Focus on realistic market opportunities and strategic recommendations WITH ACTUAL NUMBERS",
          "Include SPECIFIC market data, competitor analysis, and industry benchmarks",
          "Emphasize actionable insights and growth potential WITH QUANTIFIED TARGETS",
          "Balance constructive criticism with recognition of good work USING MARKET STANDARDS",
          "Reference actual funding rounds, market sizes, and growth rates where relevant",
          "Include specific competitor companies, their valuations, and market positions",
          "Provide industry-specific metrics and benchmarks for comparison"
        ]
      }
    }

    CRITICAL: Every analysis section MUST include real market data, specific numbers, competitor information, industry statistics, and quantified benchmarks. All "improvements" sections must be market-driven insights focusing on industry challenges and opportunities, NOT gaps in the application form.

    IMPORTANT: Be fair and generous in your scoring. If someone has put effort into their answers and shows understanding of their business, they should score well. Don't be overly critical - focus on recognizing good work while providing constructive guidance for improvement with real market data.

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
        assessment_points: analysisResult.summary?.assessment_points || [],
        user_id: effectiveUserId, // FIXED: Use the specific user ID instead of form slug
        source: 'barc_form',
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

    // Create sections with the correct mapping
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

    // Map the sections to the correct structure
    const sectionMapping = {
      'problem_solution_fit': 'Problem Solution Fit',
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

    console.log('Successfully analyzed BARC submission', submissionId, 'and', isNewCompany ? 'created' : 'updated', 'company', companyId);

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
