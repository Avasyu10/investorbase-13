// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars');
    return new Response('Server misconfiguration', { status: 500, headers: { ...corsHeaders } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Optional: ensure requester is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: { ...corsHeaders } });
    }

    // Prepare CSV
    const headerRow = 'Idea ID,Eureka ID,Score\n';
    let csv = headerRow;

    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: submissions, error: subErr } = await supabase
        .from('eureka_form_submissions')
        .select('company_id, idea_id, eureka_id')
        .not('company_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (subErr) {
        console.error('eureka_form_submissions error:', subErr);
        return new Response(JSON.stringify({ error: subErr.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (!submissions || submissions.length === 0) {
        break;
      }

      const companyIds = submissions.map((s: any) => s.company_id).filter(Boolean);

      // Fetch companies scores in chunks to avoid URL length/IN limits
      const scoresByCompany: Record<string, number | ''> = {};
      const CHUNK_SIZE = 100;
      for (let i = 0; i < companyIds.length; i += CHUNK_SIZE) {
        const chunk = companyIds.slice(i, i + CHUNK_SIZE);
        const { data: companies, error: compErr } = await supabase
          .from('companies')
          .select('id, overall_score')
          .in('id', chunk);
        if (compErr) {
          console.error('companies error:', compErr);
          // Continue with remaining chunks instead of failing entirely
          continue;
        }
        (companies || []).forEach((c: any) => {
          const score = typeof c.overall_score === 'number' ? Math.round(c.overall_score) : '';
          scoresByCompany[c.id] = score;
        });
      }

      // Append rows (include entries even if score missing)
      for (const s of submissions) {
        const rawScore = scoresByCompany[s.company_id as string];
        const ideaId = (s.idea_id ?? '').toString().replace(/"/g, '""');
        const eurekaId = (s.eureka_id ?? '').toString().replace(/"/g, '""');
        const scoreOut = rawScore === undefined || rawScore === null ? '' : rawScore;
        csv += `${ideaId},${eurekaId},${scoreOut}\n`;
      }

      from += submissions.length;
      hasMore = submissions.length === pageSize;
    }

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="eureka-data.csv"',
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    console.error('Unexpected error in export-eureka-csv:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Standard export for Supabase Edge Functions
Deno.serve(handler);
