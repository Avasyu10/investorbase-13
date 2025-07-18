import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VCMatchRequest {
  companyId: string;
}

interface VCMatch {
  fund_name: string;
  areas_of_interest: string[];
  investment_stage: string[];
  fund_size?: string;
  website_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { companyId }: VCMatchRequest = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing VC matchmaking for company:', companyId);

    // Get company data and its report
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('report_id, overall_score')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Error fetching company:', companyError);
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if score is above 65
    if (company.overall_score <= 65) {
      return new Response(JSON.stringify({ error: 'Company score must be above 65 for VC matchmaking' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get report analysis result
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('analysis_result')
      .eq('id', company.report_id)
      .single();

    if (reportError || !report || !report.analysis_result) {
      console.error('Error fetching report:', reportError);
      return new Response(JSON.stringify({ error: 'Report analysis not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract company info from analysis_result
    const analysisResult = report.analysis_result as any;
    const companyInfo = analysisResult?.company_Info || analysisResult?.companyInfo || {};
    
    const stage = companyInfo.stage || companyInfo.funding_stage || '';
    const industry = companyInfo.industry || companyInfo.sector || '';

    console.log('Company stage:', stage);
    console.log('Company industry:', industry);

    if (!stage && !industry) {
      return new Response(JSON.stringify({ error: 'Company stage and industry information not found in analysis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query VC profiles for matches
    let query = supabase
      .from('vc_profiles')
      .select('fund_name, areas_of_interest, investment_stage, fund_size, website_url');

    // If we have stage, filter by investment_stage
    if (stage) {
      query = query.overlaps('investment_stage', [stage]);
    }

    // If we have industry, filter by areas_of_interest
    if (industry) {
      query = query.overlaps('areas_of_interest', [industry]);
    }

    const { data: vcMatches, error: vcError } = await query.limit(5);

    if (vcError) {
      console.error('Error fetching VC profiles:', vcError);
      return new Response(JSON.stringify({ error: 'Error fetching VC matches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found VC matches:', vcMatches?.length || 0);

    const matches: VCMatch[] = vcMatches || [];

    return new Response(JSON.stringify({
      matches,
      companyInfo: {
        stage,
        industry
      },
      totalMatches: matches.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in VC matchmaking function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});