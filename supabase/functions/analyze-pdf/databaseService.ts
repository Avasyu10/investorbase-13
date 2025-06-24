
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function checkAnalysisLimits(token: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create service client for admin operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to get user info
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');
    
    // Get user from token
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error getting user from token:', userError);
      return {
        canAnalyze: false,
        currentCount: 0,
        maxAllowed: 0,
        error: 'Invalid user token'
      };
    }

    // Check if user is IIT Bombay (unlimited analysis)
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('is_iitbombay')
      .eq('id', user.id)
      .single();

    if (profile?.is_iitbombay) {
      return {
        canAnalyze: true,
        currentCount: 0,
        maxAllowed: -1, // Unlimited
        isIITBombay: true
      };
    }

    // For regular users, check analysis limits
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Count analyses this month
    const { count: currentCount, error: countError } = await serviceClient
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${currentMonth}-31`);

    if (countError) {
      console.error('Error counting user analyses:', countError);
      return {
        canAnalyze: false,
        currentCount: 0,
        maxAllowed: 0,
        error: 'Error checking analysis limits'
      };
    }

    const maxAllowed = 5; // Regular users get 5 analyses per month
    const canAnalyze = (currentCount || 0) < maxAllowed;

    return {
      canAnalyze,
      currentCount: currentCount || 0,
      maxAllowed,
      isIITBombay: false
    };

  } catch (error) {
    console.error('Error in checkAnalysisLimits:', error);
    return {
      canAnalyze: false,
      currentCount: 0,
      maxAllowed: 0,
      error: error.message
    };
  }
}
