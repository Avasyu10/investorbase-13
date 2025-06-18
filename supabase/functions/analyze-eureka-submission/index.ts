import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
}

interface EurekaAnalysisPayload {
  submissionId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { submissionId }: EurekaAnalysisPayload = await req.json()

    console.log(`🔬 Analyzing Eureka submission: ${submissionId}`)

    // Get the submission data
    const { data: submission, error: fetchError } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      console.error('❌ Error fetching submission:', fetchError)
      throw new Error('Submission not found')
    }

    console.log('📋 Submission data retrieved:', submission.company_name)

    // Check if company already exists for this submission to prevent duplicates
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', submission.company_name)
      .eq('source', 'eureka_form')
      .eq('user_id', submission.user_id)
      .maybeSingle()

    if (existingCompany) {
      console.log('✅ Company already exists, updating submission with existing company ID:', existingCompany.id)
      
      // Update the submission with the existing company ID
      await supabase
        .from('eureka_form_submissions')
        .update({ 
          company_id: existingCompany.id,
          analysis_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Eureka submission linked to existing company',
          submissionId,
          companyId: existingCompany.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Update status to processing only if not already processed
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending') // Only update if still pending

    if (updateError) {
      console.error('❌ Error updating submission status:', updateError)
      throw updateError
    }

    console.log('✅ Updated submission status to processing')

    // Prepare the analysis prompt
    const analysisPrompt = `
Analyze this startup application for an incubator program. Provide a comprehensive assessment covering all key areas:

**Company Information:**
- Company: ${submission.company_name}
- Industry: ${submission.company_type || 'Not specified'}
- Registration Type: ${submission.company_registration_type || 'Not specified'}

**Executive Summary:**
${submission.executive_summary || 'Not provided'}

**Application Responses:**

1. **Problem & Timing:** ${submission.question_1 || 'Not answered'}

2. **Customer Acquisition:** ${submission.question_2 || 'Not answered'}

3. **Competitive Advantage:** ${submission.question_3 || 'Not answered'}

4. **Team Background:** ${submission.question_4 || 'Not answered'}

5. **Milestones & Support:** ${submission.question_5 || 'Not answered'}

**Additional Information:**
- LinkedIn URLs: ${submission.founder_linkedin_urls?.join(', ') || 'None provided'}
- Company LinkedIn: ${submission.company_linkedin_url || 'Not provided'}
- Contact: ${submission.poc_name} (${submission.submitter_email})

**Analysis Requirements:**
Please provide a detailed analysis in the following JSON format:

{
  "overall_score": [0-100],
  "overall_assessment": "Brief summary of the startup's potential",
  "sections": [
    {
      "title": "Problem & Market Opportunity",
      "score": [0-100],
      "assessment": "Detailed analysis of problem identification and market timing",
      "strengths": ["List of strengths"],
      "weaknesses": ["List of areas for improvement"]
    },
    {
      "title": "Customer & Market Validation",
      "score": [0-100], 
      "assessment": "Analysis of customer identification and acquisition strategy",
      "strengths": ["List of strengths"],
      "weaknesses": ["List of areas for improvement"]
    },
    {
      "title": "Competitive Advantage & Differentiation",
      "score": [0-100],
      "assessment": "Evaluation of competitive moat and unique value proposition",
      "strengths": ["List of strengths"],
      "weaknesses": ["List of areas for improvement"]
    },
    {
      "title": "Team & Execution Capability",
      "score": [0-100],
      "assessment": "Assessment of team background and execution potential",
      "strengths": ["List of strengths"],
      "weaknesses": ["List of areas for improvement"]
    },
    {
      "title": "Growth Strategy & Milestones",
      "score": [0-100],
      "assessment": "Evaluation of growth plans and milestone clarity",
      "strengths": ["List of strengths"],
      "weaknesses": ["List of areas for improvement"]
    }
  ],
  "recommendations": [
    "Key recommendations for the startup",
    "Areas requiring immediate attention",
    "Suggestions for incubator support"
  ],
  "investment_readiness": "Assessment of investment readiness and potential",
  "risk_factors": ["Key risks to consider"],
  "next_steps": ["Recommended next steps for evaluation"]
}

Provide a thorough, objective analysis that would be valuable for incubator decision-making.
`

    // Call OpenAI API
    console.log('🤖 Calling OpenAI for analysis...')
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert startup analyst and investor. Provide detailed, objective analysis of startup applications for incubator programs. Focus on viability, scalability, team strength, and market opportunity.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
    }

    const openaiResult = await openaiResponse.json()
    console.log('🎯 OpenAI analysis completed')

    const analysisContent = openaiResult.choices[0]?.message?.content
    if (!analysisContent) {
      throw new Error('No analysis content received from OpenAI')
    }

    // Parse the JSON response
    let analysisResult
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: try to parse the entire content
        analysisResult = JSON.parse(analysisContent)
      }
    } catch (parseError) {
      console.error('❌ Error parsing analysis result:', parseError)
      // Store the raw content if JSON parsing fails
      analysisResult = {
        overall_score: 0,
        overall_assessment: 'Analysis parsing failed',
        raw_analysis: analysisContent,
        error: 'Failed to parse structured analysis'
      }
    }

    // Create company record so it appears in prospects (only if it doesn't exist)
    console.log('🏢 Creating new company record...')
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: submission.company_name,
        overall_score: analysisResult.overall_score || 0,
        user_id: submission.user_id,
        source: 'eureka_form',
        poc_name: submission.poc_name,
        email: submission.submitter_email,
        phonenumber: submission.phoneno,
        industry: submission.company_type,
        assessment_points: analysisResult.sections?.map(section => 
          `${section.title}: ${section.assessment}`
        ) || []
      })
      .select()
      .single()

    if (companyError) {
      console.error('❌ Error creating company record:', companyError)
      // Continue with analysis update even if company creation fails
    } else {
      console.log('✅ Company record created successfully:', newCompany?.id)
      
      // Update the submission with the company ID
      await supabase
        .from('eureka_form_submissions')
        .update({ company_id: newCompany.id })
        .eq('id', submissionId)
    }

    // Update the submission with analysis results
    const { error: analysisUpdateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (analysisUpdateError) {
      console.error('❌ Error updating analysis results:', analysisUpdateError)
      throw analysisUpdateError
    }

    console.log('✅ Analysis completed and stored successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Eureka submission analysis completed successfully',
        submissionId,
        overallScore: analysisResult.overall_score,
        companyId: newCompany?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ Eureka analysis error:', error)
    
    // Try to update the submission with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { submissionId } = await req.json().catch(() => ({ submissionId: 'unknown' }))
      
      await supabase
        .from('eureka_form_submissions')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
    } catch (updateError) {
      console.error('❌ Error updating failed status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to analyze Eureka submission',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
