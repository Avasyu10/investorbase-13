
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../analyze-pdf/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Send email notification about completed analysis
async function sendAnalysisNotification(email: string, companyName: string, companyId: string) {
  try {
    // In a real implementation, you would integrate with an email service here
    console.log(`Would send email to ${email} about analysis for ${companyName} (ID: ${companyId})`)
    
    // Mock success for now
    return { success: true }
  } catch (error) {
    console.error('Error sending email notification:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { reportId, email } = await req.json()

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'Report ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key for admin access
    const supabaseAdmin = await createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    // Get report details
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('*, companies!reports_company_id_fkey(id, name)')
      .eq('id', reportId)
      .maybeSingle()

    if (reportError || !reportData) {
      console.error('Error fetching report:', reportError)
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (reportData.companies && email) {
      // Send email notification
      const notificationResult = await sendAnalysisNotification(
        email,
        reportData.companies.name,
        reportData.companies.id
      )

      if (!notificationResult.success) {
        console.error('Error sending notification:', notificationResult.error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification sent',
        companyId: reportData.companies?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Create a Supabase client
async function createClient(supabaseUrl: string, supabaseKey: string) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  return createClient(supabaseUrl, supabaseKey)
}
