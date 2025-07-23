import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { companyId, companyName, vcData, message } = await req.json()

    console.log('Received VC connect request:', { companyId, companyName, vcData, message })

    if (!companyId || !companyName || !vcData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyId, companyName, and vcData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user profile for name and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the connection request
    const { data: connectionRequest, error: requestError } = await supabase
      .from('vc_connection_requests')
      .insert({
        founder_user_id: user.id,
        founder_name: profile.full_name || profile.email || 'Unknown',
        founder_email: profile.email || user.email || '',
        company_id: companyId,
        company_name: companyName,
        vc_name: vcData['Investor Name'],
        vc_email: vcData['Emails'] && vcData['Emails'].trim() ? vcData['Emails'] : null,
        vc_phone: vcData['Phone Numbers'] || null,
        vc_website: vcData['Website'] || null,
        vc_linkedin: vcData['LinkedIn'] || null,
        message: message || `${companyName} would like to connect with ${vcData['Investor Name']}`
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating connection request:', requestError)
      return new Response(
        JSON.stringify({ error: 'Failed to create connection request' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Connection request created successfully:', connectionRequest)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connection request sent successfully',
        connectionRequest 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})