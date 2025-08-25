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
    const { data: allSubmissions, error } = await supabase
      .from('eureka_form_submissions')
      .select('analysis_result')

    if (error) {
      console.error('Error fetching eureka submissions:', error)
      throw error
    }

    console.log(`Found ${allSubmissions?.length || 0} total eureka submissions`)

    // Calculate stats based on overall scores from analysis results
    let totalRegistrations = 0
    let highPotential = 0
    let mediumPotential = 0
    let badPotential = 0
    let analyzedCount = 0

    if (allSubmissions) {
      totalRegistrations = allSubmissions.length

      allSubmissions.forEach(submission => {
        if (submission.analysis_result?.overall_score) {
          // Has analysis - use actual score
          analyzedCount++
          const score = parseFloat(submission.analysis_result.overall_score)
          if (score > 70) {
            highPotential++
          } else if (score >= 50 && score <= 70) {
            mediumPotential++
          } else if (score < 50) {
            badPotential++
          }
        } else {
          // No analysis - assign to medium potential as default
          mediumPotential++
        }
      })
    }

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