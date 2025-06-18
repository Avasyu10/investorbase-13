
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EurekaSubmissionPayload {
  submissionId: string;
  companyName?: string;
  submitterEmail?: string;
  createdAt?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { submissionId, companyName, submitterEmail, createdAt }: EurekaSubmissionPayload = await req.json()

    console.log(`🔬 Auto-analyzing Eureka submission: ${submissionId}`)
    console.log(`📋 Company: ${companyName}, Email: ${submitterEmail}`)

    // Update status to processing
    const { error: updateError } = await supabase
      .from('eureka_form_submissions')
      .update({ 
        analysis_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('❌ Error updating submission status:', updateError)
      throw updateError
    }

    console.log('✅ Updated submission status to processing')

    // Call the main analysis function
    const analysisResponse = await supabase.functions.invoke('analyze-eureka-submission', {
      body: { submissionId }
    })

    if (analysisResponse.error) {
      console.error('❌ Analysis function error:', analysisResponse.error)
      
      // Update status to failed
      await supabase
        .from('eureka_form_submissions')
        .update({ 
          analysis_status: 'failed',
          analysis_error: analysisResponse.error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      throw analysisResponse.error
    }

    console.log('🎯 Analysis completed successfully:', analysisResponse.data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Eureka submission analysis started successfully',
        submissionId,
        analysisResult: analysisResponse.data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ Auto-analyze Eureka submission error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to auto-analyze Eureka submission',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
