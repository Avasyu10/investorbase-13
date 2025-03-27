
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "./cors.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get request data
    const { companyId } = await req.json()
    console.log('Analyzing fund thesis alignment for company:', companyId)

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the user has uploaded a fund thesis
    const { data: thesisData, error: thesisError } = await supabase
      .from('vc_documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('document_type', 'fund_thesis')
      .maybeSingle()

    if (thesisError) {
      console.error('Error fetching fund thesis:', thesisError)
      return new Response(
        JSON.stringify({ error: 'Error fetching fund thesis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!thesisData) {
      return new Response(
        JSON.stringify({ error: 'No fund thesis found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company data
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        assessment_points,
        overall_score,
        sections (
          id,
          title,
          type,
          score,
          description,
          strengths,
          weaknesses
        )
      `)
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('Error fetching company data:', companyError)
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get fund thesis content
    let thesisContent = thesisData.content || ''
    
    if (!thesisContent && thesisData.document_url) {
      // Try to get content from documents_content table
      const { data: documentContent, error: contentError } = await supabase
        .from('documents_content')
        .select('content')
        .eq('document_id', thesisData.id)
        .maybeSingle()
      
      if (!contentError && documentContent && documentContent.content) {
        thesisContent = documentContent.content
      }
    }

    if (!thesisContent) {
      console.error('No content found for fund thesis')
      return new Response(
        JSON.stringify({ error: 'Fund thesis has no content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare the prompt for OpenAI
    const prompt = `
    I need you to analyze how well a startup aligns with a venture capital fund's investment thesis.

    FUND THESIS:
    ${thesisContent.substring(0, 3000)}

    COMPANY INFORMATION:
    Name: ${companyData.name}
    Overall Score: ${companyData.overall_score}/5
    
    Key Assessment Points:
    ${companyData.assessment_points ? companyData.assessment_points.join('\n') : 'None provided'}
    
    Sections:
    ${companyData.sections.map(section => 
      `- ${section.title} (Score: ${section.score}/5)
       ${section.description ? `Description: ${section.description.substring(0, 200)}...` : ''}
       Strengths: ${section.strengths ? section.strengths.join(', ') : 'None'}
       Weaknesses: ${section.weaknesses ? section.weaknesses.join(', ') : 'None'}`
    ).join('\n\n')}

    INSTRUCTIONS:
    1. Analyze how well this company aligns with the fund's investment thesis
    2. Provide an alignment score from 1-10 where 10 is perfect alignment
    3. Give 3-5 key reasons why this company does or doesn't align with the thesis
    4. Identify the top 3 strengths of the company from the fund's perspective
    5. Identify the top 3 concerns the fund might have about this company
    6. Provide a final recommendation: "Strong Yes", "Yes", "Maybe", "No", or "Strong No"

    FORMAT YOUR RESPONSE AS JSON with these keys:
    {
      "alignmentScore": number (1-10),
      "alignmentReasons": string[],
      "fundPerspectiveStrengths": string[],
      "fundPerspectiveConcerns": string[],
      "recommendation": string,
      "summary": string
    }
    `

    // Call OpenAI API
    console.log('Calling OpenAI API...')
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a VC analyst specializing in evaluating how startups align with investment theses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
      })
    })

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json()
      console.error('OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to analyze with OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openAiData = await openAiResponse.json()
    console.log('OpenAI response received')
    
    let analysisResult
    try {
      // Try to parse the response as JSON
      const content = openAiData.choices[0].message.content
      analysisResult = JSON.parse(content)
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError)
      // Use the raw response if parsing fails
      analysisResult = {
        alignmentScore: 0,
        alignmentReasons: ['Error parsing response'],
        fundPerspectiveStrengths: [],
        fundPerspectiveConcerns: [],
        recommendation: 'Error',
        summary: openAiData.choices[0].message.content
      }
    }

    // Store the result in the database
    const { data: insertData, error: insertError } = await supabase
      .from('fund_thesis_analysis')
      .upsert({
        company_id: companyId,
        user_id: user.id,
        thesis_document_id: thesisData.id,
        alignment_score: analysisResult.alignmentScore,
        alignment_reasons: analysisResult.alignmentReasons,
        fund_perspective_strengths: analysisResult.fundPerspectiveStrengths,
        fund_perspective_concerns: analysisResult.fundPerspectiveConcerns,
        recommendation: analysisResult.recommendation,
        summary: analysisResult.summary
      })
      .select()

    if (insertError) {
      console.error('Error storing analysis result:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store analysis result', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Analysis completed and stored successfully')
    return new Response(
      JSON.stringify({
        success: true,
        result: analysisResult,
        stored: insertData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
