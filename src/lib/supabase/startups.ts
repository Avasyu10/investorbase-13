import { supabase } from "@/integrations/supabase/client";

export async function getStartupsList() {
  const { data, error } = await supabase
    .from('startup_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching startups:', error);
    throw error;
  }

  return data;
}
