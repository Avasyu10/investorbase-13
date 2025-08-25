import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Getting Eureka registration stats...')

    // Get all eureka form submissions with their analysis results
    const { data: submissions, error } = await supabase
      .from('eureka_form_submissions')
      .select('analysis_result')
      .not('analysis_result', 'is', null)

    if (error) {
      console.error('Error fetching eureka submissions:', error)
      throw error
    }

    console.log(`Found ${submissions?.length || 0} analyzed eureka submissions`)

    // Calculate stats based on overall scores from analysis results
    let totalRegistrations = 0
    let highPotential = 0
    let mediumPotential = 0
    let badPotential = 0

    if (submissions) {
      totalRegistrations = submissions.length

      submissions.forEach(submission => {
        if (submission.analysis_result?.overall_score) {
          const score = parseFloat(submission.analysis_result.overall_score)
          if (score > 70) {
            highPotential++
          } else if (score >= 50 && score <= 70) {
            mediumPotential++
          } else if (score < 50) {
            badPotential++
          }
        }
      })
    }

    // Also get total count of all eureka submissions (including unanalyzed)
    const { count: totalEurekaCount, error: countError } = await supabase
      .from('eureka_form_submissions')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error getting total eureka count:', countError)
    }

    const stats = {
      totalRegistrations: totalEurekaCount || totalRegistrations,
      analyzedRegistrations: totalRegistrations,
      highPotential,
      mediumPotential,
      badPotential
    }

    console.log('Eureka stats:', stats)

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in get-eureka-stats function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        totalRegistrations: 0,
        analyzedRegistrations: 0,
        highPotential: 0,
        mediumPotential: 0,
        badPotential: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})