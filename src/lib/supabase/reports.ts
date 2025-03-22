
export async function getReports() {
  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    toast({
      title: "Authentication required",
      description: "Please sign in to view reports",
      variant: "destructive"
    });
    return [];
  }

  // Get reports from the reports table - including both user-owned reports 
  // and reports associated with companies user owns
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .or(`user_id.eq.${user.id},companies.user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    throw tableError;
  }

  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData);
    return tableData as Report[];
  }

  console.log('No reports found');
  return [];
}
