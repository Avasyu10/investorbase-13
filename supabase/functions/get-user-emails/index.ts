
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: { persistSession: false }
      }
    );

    const { userIds } = await req.json();
    console.log('Received user IDs:', userIds);
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid user IDs array is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // First, try to fetch from profiles table using service role key
    const { data: profilesData, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('Profiles data retrieved:', profilesData);
    
    // Now try to get missing emails from auth.users table for any missing IDs
    const foundIds = profilesData.map(profile => profile.id);
    const missingIds = userIds.filter(id => !foundIds.includes(id));
    
    console.log('Missing user IDs that need emails:', missingIds);
    
    let authUsersData: any[] = [];
    
    if (missingIds.length > 0) {
      // Try to fetch these from auth.users directly (requires service role key)
      for (const userId of missingIds) {
        try {
          const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
          
          if (!userError && userData && userData.user) {
            console.log(`Found user in auth.users: ${userId} -> ${userData.user.email}`);
            authUsersData.push({
              id: userId,
              email: userData.user.email
            });
          } else {
            console.log(`User not found in auth.users: ${userId}`, userError);
            // Add placeholder for users not found in auth.users
            authUsersData.push({
              id: userId,
              email: null
            });
          }
        } catch (err) {
          console.error(`Error fetching user ${userId} from auth.users:`, err);
          // Add placeholder for users with errors
          authUsersData.push({
            id: userId,
            email: null
          });
        }
      }
    }
    
    // Combine results from both queries
    const combinedData = [...profilesData, ...authUsersData];
    console.log('Combined user data:', combinedData);
    
    // Ensure we have an entry for every requested ID, even if null
    const finalData = userIds.map(id => {
      const foundUser = combinedData.find(u => u.id === id);
      return foundUser || { id, email: null };
    });
    
    console.log('Final response data:', finalData);
    
    return new Response(
      JSON.stringify(finalData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
