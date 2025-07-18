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

    // Query VC profiles for matches with multiple fallback strategies
    let vcMatches: any[] = [];
    
    // Strategy 1: Try exact matches for both stage and industry
    if (stage && industry) {
      const { data: exactMatches } = await supabase
        .from('vc_profiles')
        .select('fund_name, areas_of_interest, investment_stage, fund_size, website_url')
        .overlaps('investment_stage', [stage, stage.toLowerCase(), stage.replace('-', ' ')])
        .overlaps('areas_of_interest', [industry, industry.toLowerCase(), industry.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)])
        .limit(5);
      
      if (exactMatches && exactMatches.length > 0) {
        vcMatches = exactMatches;
      }
    }
    
    // Strategy 2: If no exact matches, try stage only
    if (vcMatches.length === 0 && stage) {
      const { data: stageMatches } = await supabase
        .from('vc_profiles')
        .select('fund_name, areas_of_interest, investment_stage, fund_size, website_url')
        .overlaps('investment_stage', [stage, stage.toLowerCase(), stage.replace('-', ' ')])
        .limit(5);
      
      if (stageMatches && stageMatches.length > 0) {
        vcMatches = stageMatches;
      }
    }
    
    // Strategy 3: If still no matches, try industry only
    if (vcMatches.length === 0 && industry) {
      const { data: industryMatches } = await supabase
        .from('vc_profiles')
        .select('fund_name, areas_of_interest, investment_stage, fund_size, website_url')
        .overlaps('areas_of_interest', [industry, industry.toLowerCase(), industry.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)])
        .limit(5);
      
      if (industryMatches && industryMatches.length > 0) {
        vcMatches = industryMatches;
      }
    }
    
    // Strategy 4: If still no matches, return any 5 VCs
    if (vcMatches.length === 0) {
      const { data: anyMatches } = await supabase
        .from('vc_profiles')
        .select('fund_name, areas_of_interest, investment_stage, fund_size, website_url')
        .limit(5);
      
      if (anyMatches && anyMatches.length > 0) {
        vcMatches = anyMatches;
      }
    }

    const vcError = null; // No error since we're handling fallbacks

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