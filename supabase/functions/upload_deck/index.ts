
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    const { deck_name, analysis_result } = await req.json()

    if (!deck_name) {
      return new Response(
        JSON.stringify({ error: 'deck_name is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Uploading deck:', deck_name)

    // Insert data into the bitsanalysis table
    const { data, error } = await supabaseClient
      .from('bitsanalysis')
      .insert({
        deck_name,
        analysis_result: analysis_result || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting data:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to upload deck data', details: error.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully uploaded deck:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deck uploaded successfully',
        data: data
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in upload_deck function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
