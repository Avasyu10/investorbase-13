
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

    // Parse request body
    const requestData = await req.json();
    const { userIds, searchEmail } = requestData;
    
    // Handle user email search if searchEmail is provided
    if (searchEmail) {
      console.log('Searching for users with email containing:', searchEmail);
      
      // First, try to find profile matches (this will be limited by RLS)
      const { data: profileMatches } = await supabaseClient
        .from('profiles')
        .select('id, email')
        .ilike('email', `%${searchEmail}%`);
      
      // Also search auth.users directly with service role (this is more comprehensive)
      // Note: We have to list users and filter manually since there's no direct search API 
      // This will only return first 1000 users - in production you would need pagination
      let { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        return new Response(
          JSON.stringify({ error: 'Error searching users by email' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      // Filter users whose email contains the search term (case insensitive)
      const filteredUsers = authUsers.users.filter(user => 
        user.email && user.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
      
      // Transform to our standard response format
      const matches = filteredUsers.map(user => ({
        id: user.id,
        email: user.email
      }));
      
      // Combine results and deduplicate
      const combinedResults = [...(profileMatches || []), ...matches];
      const uniqueUsers = Array.from(
        new Map(combinedResults.map(item => [item.id, item])).values()
      );
      
      console.log(`Found ${uniqueUsers.length} users matching email search: ${searchEmail}`);
      
      return new Response(
        JSON.stringify(uniqueUsers),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Proceed with the regular user ID lookup if no search email
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid user IDs array is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('Received user IDs:', userIds);
    
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
