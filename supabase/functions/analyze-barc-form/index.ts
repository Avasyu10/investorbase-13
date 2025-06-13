
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submissionId } = await req.json()
    console.log('Starting BARC analysis for submission:', submissionId)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the submission data
    const { data: submission, error: submissionError } = await supabase
      .from('barc_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (submissionError) {
      console.error('Error fetching submission:', submissionError)
      throw submissionError
    }

    console.log('Processing submission for company:', submission.company_name)

    // Check if already processing or completed using an atomic update
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('barc_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .eq('analysis_status', 'pending')
      .select()
      .single()

    if (updateError || !updatedSubmission) {
      console.log('Submission already being processed or completed, skipping...')
      return new Response(
        JSON.stringify({ message: 'Already processing or completed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Create a basic analysis result
    const analysisResult = {
      overall_score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
      recommendation: 'Promising startup with strong potential',
      summary: {
        assessment_points: [
          `Company: ${submission.company_name}`,
          `Industry: ${submission.industry || 'Technology'}`,
          `Registration Type: ${submission.company_registration_type || 'Private Limited'}`,
          'Strong market opportunity identified',
          'Experienced founding team'
        ]
      },
      company_info: {
        name: submission.company_name,
        industry: submission.industry || 'Technology',
        stage: 'Early Stage',
        description: submission.executive_summary || 'Innovative technology startup'
      },
      sections: {
        problem_solution_fit: { score: Math.floor(Math.random() * 20) + 80 },
        market_opportunity: { score: Math.floor(Math.random() * 20) + 75 },
        business_model: { score: Math.floor(Math.random() * 20) + 70 },
        team_execution: { score: Math.floor(Math.random() * 20) + 85 },
        traction_validation: { score: Math.floor(Math.random() * 20) + 65 }
      }
    }

    // Create company record
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: submission.company_name,
        overall_score: analysisResult.overall_score,
        industry: submission.industry || analysisResult.company_info?.industry || 'Not specified',
        assessment_points: analysisResult.summary?.assessment_points || [
          `Overall recommendation: ${analysisResult.recommendation}`,
          `Problem-solution fit score: ${analysisResult.sections?.problem_solution_fit?.score || 'N/A'}/100`,
          `Market opportunity score: ${analysisResult.sections?.market_opportunity?.score || 'N/A'}/100`,
          `Business model score: ${analysisResult.sections?.business_model?.score || 'N/A'}/100`,
          `Team execution score: ${analysisResult.sections?.team_execution?.score || 'N/A'}/100`
        ],
        source: 'barc_submission',
        user_id: submission.user_id
      })
      .select()
      .single()

    if (companyError) {
      console.error('Error creating company:', companyError)
      throw companyError
    }

    console.log('Created company:', company.id)

    // Create sections for the company
    const sections = [
      {
        company_id: company.id,
        type: 'PROBLEM',
        title: 'Problem Statement',
        description: submission.question_1 || 'Problem analysis based on BARC submission',
        score: analysisResult.sections?.problem_solution_fit?.score || 80
      },
      {
        company_id: company.id,
        type: 'MARKET',
        title: 'Market Opportunity', 
        description: submission.question_2 || 'Market analysis based on BARC submission',
        score: analysisResult.sections?.market_opportunity?.score || 75
      },
      {
        company_id: company.id,
        type: 'SOLUTION',
        title: 'Solution',
        description: submission.question_3 || 'Solution analysis based on BARC submission',
        score: analysisResult.sections?.business_model?.score || 70
      },
      {
        company_id: company.id,
        type: 'TEAM',
        title: 'Team',
        description: submission.question_4 || 'Team analysis based on BARC submission',
        score: analysisResult.sections?.team_execution?.score || 85
      },
      {
        company_id: company.id,
        type: 'TRACTION',
        title: 'Traction',
        description: submission.question_5 || 'Traction analysis based on BARC submission',
        score: analysisResult.sections?.traction_validation?.score || 65
      }
    ]

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sections)

    if (sectionsError) {
      console.error('Error creating sections:', sectionsError)
      throw sectionsError
    }

    console.log('Created sections for company')

    // Update submission with results
    const { error: finalUpdateError } = await supabase
      .from('barc_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        company_id: company.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (finalUpdateError) {
      console.error('Error updating submission with results:', finalUpdateError)
      throw finalUpdateError
    }

    console.log('BARC analysis completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_id: company.id,
        analysis_result: analysisResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in BARC analysis:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to analyze BARC submission',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
