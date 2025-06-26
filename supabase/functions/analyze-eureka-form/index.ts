
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

    // Build analysis prompt with submission data - ENHANCED for better analysis
    const analysisPrompt = `
    You are an expert startup evaluator for IIT Bombay's incubation program. Your analysis should be thorough, practical, and include specific actionable insights with real market data.

    CRITICAL JSON FORMATTING REQUIREMENTS:
    - You MUST return ONLY valid JSON with no markdown formatting, code blocks, or additional text
    - Use simple quotes and avoid complex escape sequences
    - When mentioning dollar amounts, use "USD" instead of the dollar symbol
    - When mentioning percentages, write them as "8-10 percent" instead of using % symbol
    - Avoid using ampersand (&) symbols - write "and" instead
    - No backticks, no explanatory text - just pure JSON

    Company Information:
    - Company Name: ${submission.company_name || 'Not provided'}
    - Registration Type: ${submission.company_registration_type || 'Not provided'}
    - Industry: ${submission.company_type || 'Not provided'}
    - Executive Summary: ${submission.executive_summary || 'Not provided'}

    Application Analysis Framework:

    1. PROBLEM AND SOLUTION ANALYSIS: "${submission.question_1 || 'Not provided'}"
    Evaluate: Problem clarity, solution viability, market timing, innovation level
    
    2. TARGET MARKET ASSESSMENT: "${submission.question_2 || 'Not provided'}"
    Evaluate: Customer segmentation, market size, accessibility, validation evidence
    
    3. COMPETITIVE LANDSCAPE: "${submission.question_3 || 'Not provided'}"
    Evaluate: Competitor awareness, differentiation strategy, market positioning, barriers to entry
    
    4. REVENUE MODEL EVALUATION: "${submission.question_4 || 'Not provided'}"
    Evaluate: Revenue streams, pricing strategy, scalability, financial projections
    
    5. DIFFERENTIATION STRATEGY: "${submission.question_5 || 'Not provided'}"
    Evaluate: Unique value proposition, competitive advantages, IP potential, market opportunity

    SCORING GUIDELINES (0-100 scale):
    - 85-100: Exceptional - Ready for top-tier funding
    - 70-84: Strong - High potential with minor improvements needed
    - 55-69: Moderate - Good foundation but significant development required
    - 40-54: Weak - Major improvements needed across multiple areas
    - 0-39: Poor - Fundamental issues that need addressing

    ASSESSMENT POINTS REQUIREMENTS:
    Generate 8-12 specific, actionable assessment points that include:
    - Market size data and growth projections for the specific industry
    - Competitor analysis with actual company names and valuations
    - Technology trends and adoption rates
    - Customer acquisition cost benchmarks for the industry
    - Revenue model comparisons with similar successful startups
    - Regulatory considerations and compliance requirements
    - Team composition recommendations based on industry standards
    - Funding landscape analysis for the sector
    - Go-to-market strategy recommendations with timeline
    - Risk assessment with mitigation strategies

    OVERALL SCORE CALCULATION:
    Weight sections as: Problem/Solution (30%), Market (25%), Competition (20%), Revenue (15%), Differentiation (10%)

    Return ONLY this JSON structure:
    {
      "overall_score": 75,
      "scoring_reason": "Comprehensive one-sentence assessment with specific market context and key strengths/weaknesses",
      "recommendation": "Accept/Consider/Reject with brief justification",
      "company_info": {
        "industry": "specific industry classification",
        "stage": "Idea/MVP/Early Revenue/Growth based on application maturity",
        "introduction": "2-3 sentence company description with market context and potential"
      },
      "sections": {
        "problem_solution_fit": {
          "score": 75,
          "analysis": "Detailed analysis of problem identification and solution approach with market validation",
          "strengths": ["4-5 specific strengths with market data and examples"],
          "improvements": ["4-5 specific recommendations with industry benchmarks and actionable steps"]
        },
        "target_market": {
          "score": 75,
          "analysis": "Comprehensive market analysis with sizing, segmentation, and accessibility assessment",
          "strengths": ["4-5 specific strengths with customer data and market research"],
          "improvements": ["4-5 specific recommendations with market penetration strategies and metrics"]
        },
        "competitive_analysis": {
          "score": 75,
          "analysis": "Thorough competitive landscape review with positioning and differentiation assessment",
          "strengths": ["4-5 specific strengths with competitor comparisons and market positioning"],
          "improvements": ["4-5 specific recommendations with competitive strategy and market entry tactics"]
        },
        "business_model": {
          "score": 75,
          "analysis": "Detailed revenue model evaluation with scalability and sustainability assessment",
          "strengths": ["4-5 specific strengths with revenue benchmarks and financial projections"],
          "improvements": ["4-5 specific recommendations with pricing optimization and revenue diversification"]
        },
        "innovation_differentiation": {
          "score": 75,
          "analysis": "Innovation assessment with differentiation strategy and competitive advantage evaluation",
          "strengths": ["4-5 specific strengths with technology trends and market opportunities"],
          "improvements": ["4-5 specific recommendations with innovation roadmap and IP strategy"]
        }
      },
      "summary": {
        "overall_feedback": "Comprehensive 3-4 sentence evaluation highlighting key strengths, challenges, and potential",
        "key_factors": ["5-6 critical success factors with specific metrics and benchmarks"],
        "next_steps": ["5-6 prioritized action items with timelines and success metrics"],
        "assessment_points": [
          "Market size analysis: The industry is valued at X billion USD with Y percent annual growth",
          "Competitive landscape: Key players include Company A (valued at X USD) and Company B (market share Y percent)",
          "Customer acquisition: Industry CAC averages X USD with CLTV ratios of Y:1",
          "Technology adoption: Current market penetration is X percent with projected growth to Y percent by 2025",
          "Revenue benchmarks: Similar startups achieve X USD ARR at this stage with Y percent growth rates",
          "Funding environment: Seed rounds in this sector average X million USD with Series A at Y million USD",
          "Regulatory landscape: Key compliance requirements include X, Y, and Z with typical costs of A USD",
          "Team requirements: Successful companies in this space typically have X technical roles and Y business roles",
          "Go-to-market timeline: Industry standard is X months for MVP, Y months for market entry",
          "Risk factors: Primary risks include market timing, competition from big tech, and regulatory changes",
          "Success metrics: Key KPIs should include user acquisition rate, retention, revenue per user, and market share",
          "Strategic partnerships: Consider alliances with established players in adjacent markets for faster growth"
        ]
      }
    }

    IMPORTANT: Every analysis must include specific market data, competitor information, financial benchmarks, and actionable recommendations. Assessment points should be detailed insights that demonstrate deep market understanding and provide clear guidance for the startup's development.

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
          temperature: 0.2,
          maxOutputTokens: 6000,
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
        user_id: effectiveUserId,
        source: 'eureka_form',
        industry: analysisResult.company_info?.industry || submission.company_type || null,
        stage: analysisResult.company_info?.stage || 'Early Stage',
        introduction: analysisResult.company_info?.introduction || `${submission.company_name} is an innovative startup in the ${submission.company_type || 'technology'} sector.`,
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
        industry: analysisResult.company_info?.industry || submission.company_type || null,
        stage: analysisResult.company_info?.stage || 'Early Stage',
        introduction: analysisResult.company_info?.introduction || `${submission.company_name} is an innovative startup in the ${submission.company_type || 'technology'} sector.`,
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

    // Create sections with proper mapping
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

    // Map the sections with proper names and types
    const sectionMapping = {
      'problem_solution_fit': { title: 'Problem & Solution Analysis', type: 'PROBLEM_SOLUTION' },
      'target_market': { title: 'Target Market Assessment', type: 'MARKET_ANALYSIS' },
      'competitive_analysis': { title: 'Competitive Landscape', type: 'COMPETITIVE_ANALYSIS' },
      'business_model': { title: 'Business Model & Revenue', type: 'BUSINESS_MODEL' },
      'innovation_differentiation': { title: 'Innovation & Differentiation', type: 'INNOVATION' }
    };

    const sectionsToCreate = Object.entries(analysisResult.sections || {}).map(([sectionKey, sectionData]: [string, any]) => {
      const mappingData = sectionMapping[sectionKey as keyof typeof sectionMapping];
      return {
        company_id: companyId,
        score: sectionData.score || 0,
        section_type: sectionKey,
        type: mappingData?.type || 'ANALYSIS',
        title: mappingData?.title || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: sectionData.analysis || 'Analysis not available'
      };
    });

    if (sectionsToCreate.length > 0) {
      const { data: createdSections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select();

      if (sectionsError) {
        console.error('Error creating sections:', sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Created sections:', createdSections?.length || 0);

      // Create section details for each section
      let totalDetailsCreated = 0;
      for (const section of createdSections || []) {
        const sectionKey = section.section_type;
        const sectionData = analysisResult.sections[sectionKey];
        
        if (sectionData && (sectionData.strengths || sectionData.improvements)) {
          const detailsToCreate = [];
          
          // Add strengths
          if (sectionData.strengths && Array.isArray(sectionData.strengths)) {
            sectionData.strengths.forEach((strength: string, index: number) => {
              detailsToCreate.push({
                section_id: section.id,
                detail_type: 'strength',
                content: strength,
                order_index: index
              });
            });
          }
          
          // Add improvements  
          if (sectionData.improvements && Array.isArray(sectionData.improvements)) {
            sectionData.improvements.forEach((improvement: string, index: number) => {
              detailsToCreate.push({
                section_id: section.id,
                detail_type: 'weakness',
                content: improvement,
                order_index: index
              });
            });
          }
          
          if (detailsToCreate.length > 0) {
            const { error: detailsError } = await supabase
              .from('section_details')
              .insert(detailsToCreate);
              
            if (detailsError) {
              console.error('Error creating section details:', detailsError);
            } else {
              totalDetailsCreated += detailsToCreate.length;
            }
          }
        }
      }
      
      console.log('Created section details:', totalDetailsCreated);
    }

    // Update submission with final analysis results
    console.log('Updating submission with final analysis results...');
    const { error: finalUpdateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'completed',
        company_id: companyId,
        analysis_result: analysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (finalUpdateError) {
      console.error('Error updating submission with final results:', finalUpdateError);
      throw new Error(`Failed to update submission: ${finalUpdateError.message}`);
    }

    console.log(`Successfully analyzed Eureka submission ${submissionId} and created company ${companyId}`);

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

    // Update submission status to failed if we have a submissionId
    if (submissionId) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('eureka_form_submissions')
          .update({
            analysis_status: 'failed',
            analysis_error: error instanceof Error ? error.message : 'Analysis failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
          
        console.log('Updated submission status to failed');
      } catch (updateError) {
        console.error('Error updating submission status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
