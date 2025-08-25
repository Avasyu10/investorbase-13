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

    // First get the total count of all eureka submissions
    const { count: totalCount, error: countError } = await supabase
      .from('eureka_form_submissions')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error getting total eureka count:', countError)
      throw countError
    }

    console.log(`Total eureka registrations: ${totalCount}`)

    // Get all analyzed submissions (those with analysis_result)
    const { data: analyzedSubmissions, error: analyzedError } = await supabase
      .from('eureka_form_submissions')
      .select('analysis_result')
      .not('analysis_result', 'is', null)

    if (analyzedError) {
      console.error('Error fetching analyzed eureka submissions:', analyzedError)
      throw analyzedError
    }

    console.log(`Found ${analyzedSubmissions?.length || 0} analyzed eureka submissions`)

    // Calculate stats based on overall scores from analysis results
    let totalRegistrations = totalCount || 0
    let analyzedCount = analyzedSubmissions?.length || 0
    let highPotential = 0
    let mediumPotential = 0
    let badPotential = 0

    // Process analyzed submissions
    if (analyzedSubmissions) {
      analyzedSubmissions.forEach(submission => {
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

    // Add unanalyzed submissions to medium potential
    const unanalyzedCount = totalRegistrations - analyzedCount
    mediumPotential += unanalyzedCount

    console.log(`Breakdown: High: ${highPotential}, Medium: ${mediumPotential}, Bad: ${badPotential}, Total: ${totalRegistrations}`)

    const stats = {
      totalRegistrations,
      analyzedRegistrations: analyzedCount,
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