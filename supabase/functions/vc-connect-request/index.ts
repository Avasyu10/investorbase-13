import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { vcName, vcIndex, companyId, companyName, founderUserId } = await req.json();

    console.log('Received connection request:', {
      vcName,
      vcIndex,
      companyId,
      companyName,
      founderUserId
    });

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, industry')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company stage from company_details if available
    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('stage')
      .eq('company_id', companyId)
      .single();

    // Create connection notification
    const { error: notificationError } = await supabase
      .from('vc_connection_requests')
      .insert({
        vc_name: vcName,
        vc_index: vcIndex,
        company_id: companyId,
        company_name: companyName || company.name,
        company_stage: companyDetails?.stage,
        company_industry: company.industry,
        founder_user_id: founderUserId,
        message: `${companyName || company.name} is interested in connecting with you!`,
        status: 'pending'
      });

    if (notificationError) {
      console.error('Error creating connection request:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create connection request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connection request created successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Connection request sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vc-connect-request function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});