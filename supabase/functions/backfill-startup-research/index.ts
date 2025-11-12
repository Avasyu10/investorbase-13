import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backfill of startup market research...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all startup submissions that don't have research
    const { data: submissions, error: fetchError } = await supabase
      .from('startup_submissions')
      .select('id, startup_name');

    if (fetchError) {
      throw fetchError;
    }

    if (!submissions || submissions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No submissions found to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${submissions.length} submissions to process`);

    const results = {
      total: submissions.length,
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Process each submission
    for (const submission of submissions) {
      try {
        // Check if research already exists
        const { data: existingResearch } = await supabase
          .from('startup_market_research')
          .select('id, status')
          .eq('startup_submission_id', submission.id)
          .single();

        if (existingResearch && existingResearch.status === 'completed') {
          console.log(`Skipping ${submission.startup_name} - research already exists`);
          results.skipped++;
          results.details.push({
            submission_id: submission.id,
            startup_name: submission.startup_name,
            status: 'skipped',
            reason: 'Research already exists'
          });
          continue;
        }

        // Trigger research generation
        console.log(`Triggering research for ${submission.startup_name}...`);
        const researchResponse = await supabase.functions.invoke('startup-market-research', {
          body: { submissionId: submission.id }
        });

        if (researchResponse.error) {
          console.error(`Error processing ${submission.startup_name}:`, researchResponse.error);
          results.errors++;
          results.details.push({
            submission_id: submission.id,
            startup_name: submission.startup_name,
            status: 'error',
            error: researchResponse.error.message
          });
        } else {
          console.log(`Successfully processed ${submission.startup_name}`);
          results.processed++;
          results.details.push({
            submission_id: submission.id,
            startup_name: submission.startup_name,
            status: 'completed'
          });
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Error processing submission ${submission.id}:`, error);
        results.errors++;
        results.details.push({
          submission_id: submission.id,
          startup_name: submission.startup_name,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('Backfill completed:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
