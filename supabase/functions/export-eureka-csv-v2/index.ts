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

  // Require auth header (since verify_jwt = true)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: { ...corsHeaders } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Prepare CSV header for both Eureka and BARC prospects
    let csv = 'Idea ID,Prospect ID,Score\n';

    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      // Get both Eureka and BARC submissions for comprehensive IIT Bombay data
      const { data: eurekaSubmissions, error: eurekaErr } = await supabase
        .from('eureka_form_submissions')
        .select('company_id, idea_id, eureka_id')
        .not('company_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
        
      const { data: barcSubmissions, error: barcErr } = await supabase
        .from('barc_form_submissions')
        .select('company_id, id as idea_id')
        .not('company_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (eurekaErr && barcErr) {
        console.error('Both submissions errors:', { eurekaErr, barcErr });
        break;
      }

      // Combine submissions with preference for Eureka data
      let submissions: any[] = [];
      if (eurekaSubmissions && eurekaSubmissions.length > 0) {
        submissions = eurekaSubmissions;
      }
      if (barcSubmissions && barcSubmissions.length > 0) {
        // Add BARC submissions that don't have corresponding Eureka submissions
        const eurekaCompanyIds = new Set(eurekaSubmissions?.map(e => e.company_id) || []);
        const uniqueBarcSubmissions = barcSubmissions
          .filter(b => !eurekaCompanyIds.has(b.company_id))
          .map(b => ({ ...b, eureka_id: `BARC-${b.idea_id}` }));
        submissions = [...submissions, ...uniqueBarcSubmissions];
      }

      if (!submissions || submissions.length === 0) {
        break;
      }

      // unique company ids for the page
      const companyIds = Array.from(new Set(submissions.map((s: any) => s.company_id).filter(Boolean)));

      // Fetch company scores in small chunks to avoid URL length issues
      const scoresByCompany: Record<string, number | ''> = {};
      const CHUNK = 20;
      for (let i = 0; i < companyIds.length; i += CHUNK) {
        const chunk = companyIds.slice(i, i + CHUNK);
        const { data: companies, error: compErr } = await supabase
          .from('companies')
          .select('id, overall_score')
          .in('id', chunk);
        if (compErr) {
          console.error('companies chunk error:', compErr);
          // skip this chunk
          continue;
        }
        (companies || []).forEach((c: any) => {
          const score = typeof c.overall_score === 'number' ? Math.round(c.overall_score) : '';
          scoresByCompany[c.id] = score;
        });
      }

      // Append rows (include even if score missing)
      for (const s of submissions) {
        const scoreOut = scoresByCompany[s.company_id as string] ?? '';
        const ideaId = (s.idea_id ?? '').toString().replace(/"/g, '""');
        const eurekaId = (s.eureka_id ?? '').toString().replace(/"/g, '""');
        csv += `${ideaId},${eurekaId},${scoreOut}\n`;
      }

      from += submissions.length;
      hasMore = submissions.length === PAGE_SIZE;
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
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

Deno.serve(handler);
