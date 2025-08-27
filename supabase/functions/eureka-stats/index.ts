// Supabase Edge Function: eureka-stats
// Computes accurate Eureka stats per submission using service role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function computeEurekaStats() {
  let high = 0;
  let medium = 0;
  let bad = 0;

  const batchSize = 1000;
  let start = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: subsBatch, error: subsError } = await supabase
      .from('eureka_form_submissions')
      .select('id, company_id')
      .range(start, start + batchSize - 1);

    if (subsError) {
      console.error('eureka-stats: Error fetching submissions batch', subsError);
      throw subsError;
    }

    if (!subsBatch || subsBatch.length === 0) {
      hasMore = false;
      break;
    }

    // Collect unique company IDs for this batch
    const companyIds = Array.from(
      new Set(subsBatch.map((s) => s.company_id).filter((id): id is string => !!id))
    );

    let companyScoreMap = new Map<string, number | null>();

    if (companyIds.length > 0) {
      // Fetch companies with their overall_score in smaller chunks to avoid URI limit
      const chunkSize = 100; // Reduced from 1000 to avoid 414 error
      for (let i = 0; i < companyIds.length; i += chunkSize) {
        const chunk = companyIds.slice(i, i + chunkSize);
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, overall_score')
          .in('id', chunk);

        if (companiesError) {
          console.error('eureka-stats: Error fetching companies chunk', companiesError);
          throw companiesError;
        }

        companiesData?.forEach((c) => {
          companyScoreMap.set(c.id, (c as any).overall_score ?? null);
        });
      }
    }

    // Classify each submission based on its company's score - only count those with scores
    for (const sub of subsBatch) {
      const score = sub.company_id ? companyScoreMap.get(sub.company_id) ?? null : null;
      if (score !== null && typeof score === 'number') {
        if (score > 70) {
          high += 1;
        } else if (score >= 50) {
          medium += 1;
        } else {
          bad += 1;
        }
      }
      // Skip submissions without scores (don't count them at all)
    }

    // Move to next submissions batch
    start += batchSize;
    hasMore = subsBatch.length === batchSize;
  }

  const totalAnalyzed = high + medium + bad;

  return {
    totalProspects: totalAnalyzed,
    highPotential: high,
    mediumPotential: medium,
    badPotential: bad,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('eureka-stats: Computing stats');
    const stats = await computeEurekaStats();
    console.log('eureka-stats: Computed', stats);

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('eureka-stats: Failed', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
