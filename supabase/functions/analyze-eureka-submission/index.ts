
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submissionId } = await req.json()
    
    if (!submissionId) {
      throw new Error('Submission ID is required')
    }

    console.log(`🔬 Starting analysis for Eureka submission: ${submissionId}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the submission data
    const { data: submission, error: fetchError } = await supabase
      .from('eureka_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch submission: ${fetchError.message}`)
    }

    console.log(`📋 Retrieved submission for company: ${submission.company_name}`)

    // Update status to processing
    await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    // Simulate analysis process (replace with actual analysis logic)
    const analysisResult = {
      overall_score: Math.floor(Math.random() * 100) + 1,
      company_summary: `Analysis completed for ${submission.company_name}`,
      strengths: [
        "Strong market opportunity",
        "Experienced team",
        "Clear value proposition"
      ],
      weaknesses: [
        "Limited market validation",
        "Competitive landscape challenges"
      ],
      recommendations: [
        "Focus on customer acquisition",
        "Develop stronger competitive moat"
      ],
      analyzed_at: new Date().toISOString()
    }

    // Update submission with analysis results
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({
        analysis_status: 'completed',
        analysis_result: analysisResult,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (updateError) {
      throw new Error(`Failed to update submission: ${updateError.message}`)
    }

    console.log(`✅ Analysis completed for submission: ${submissionId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        submissionId,
        message: 'Analysis completed successfully' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error in analyze-eureka-submission:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
