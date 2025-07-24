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
  id: string;
  fund_name: string;
  areas_of_interest: string[];
  investment_stage: string[];
  fund_size?: string;
  website_url?: string;
  match_score?: number;
  match_reasons?: string[];
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

    // Normalize stage and industry for better matching
    const normalizeStage = (stage: string): string[] => {
      const variations = [stage.toLowerCase()];
      const stageMap: Record<string, string[]> = {
        'pre-seed': ['pre-seed', 'preseed', 'pre seed'],
        'seed': ['seed', 'early stage'],
        'series a': ['series a', 'series-a', 'a', 'early growth'],
        'series b': ['series b', 'series-b', 'b', 'growth'],
        'series c': ['series c', 'series-c', 'c', 'expansion'],
        'growth': ['growth', 'late stage', 'expansion'],
        'late stage': ['late stage', 'growth', 'expansion']
      };
      
      for (const [key, values] of Object.entries(stageMap)) {
        if (values.some(v => stage.toLowerCase().includes(v))) {
          variations.push(...values, key);
        }
      }
      return [...new Set(variations)];
    };

    const normalizeIndustry = (industry: string): string[] => {
      const variations = [industry.toLowerCase()];
      const industryMap: Record<string, string[]> = {
        'fintech': ['fintech', 'financial technology', 'finance', 'payments'],
        'saas': ['saas', 'software as a service', 'enterprise software', 'b2b software'],
        'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'ai-ml'],
        'healthcare': ['healthcare', 'health tech', 'biotech', 'medical'],
        'cybersecurity': ['cybersecurity', 'security', 'cyber security', 'infosec'],
        'edtech': ['edtech', 'education technology', 'education', 'learning'],
        'blockchain': ['blockchain', 'crypto', 'web3', 'defi'],
        'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace']
      };
      
      // Add normalized variations
      const normalized = industry.toLowerCase()
        .replace(/([A-Z])/g, '-$1')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      variations.push(normalized);
      
      for (const [key, values] of Object.entries(industryMap)) {
        if (values.some(v => industry.toLowerCase().includes(v))) {
          variations.push(...values, key);
        }
      }
      return [...new Set(variations)];
    };

    // Calculate match score
    const calculateMatchScore = (vc: any, companyStage: string, companyIndustry: string): { score: number, reasons: string[] } => {
      let score = 0;
      const reasons: string[] = [];
      
      const stageVariations = normalizeStage(companyStage);
      const industryVariations = normalizeIndustry(companyIndustry);
      
      // Stage matching (40% weight)
      const stageMatches = vc.investment_stage?.some((vcStage: string) => 
        stageVariations.some(variation => vcStage.toLowerCase().includes(variation))
      );
      if (stageMatches) {
        score += 40;
        reasons.push(`Invests in ${companyStage} stage`);
      }
      
      // Industry matching (50% weight)
      const industryMatches = vc.areas_of_interest?.some((vcArea: string) => 
        industryVariations.some(variation => vcArea.toLowerCase().includes(variation))
      );
      if (industryMatches) {
        score += 50;
        reasons.push(`Focuses on ${companyIndustry} sector`);
      }
      
      // Fund size relevance (10% weight)
      if (vc.fund_size) {
        const fundSizeMatch = vc.fund_size.toLowerCase().includes('m') || vc.fund_size.toLowerCase().includes('million');
        if (fundSizeMatch) {
          score += 10;
          reasons.push('Appropriate fund size');
        }
      }
      
      return { score, reasons };
    };

    // Get all VC profiles first
    const { data: allVCs, error: vcError } = await supabase
      .from('vc_profiles')
      .select('id, fund_name, areas_of_interest, investment_stage, fund_size, website_url');

    if (vcError) {
      console.error('Error fetching VC profiles:', vcError);
      return new Response(JSON.stringify({ error: 'Error fetching VC matches' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Score and rank all VCs
    const scoredMatches = (allVCs || [])
      .map(vc => {
        const matchData = calculateMatchScore(vc, stage, industry);
        return {
          ...vc,
          match_score: matchData.score,
          match_reasons: matchData.reasons
        };
      })
      .filter(vc => vc.match_score > 0) // Only include VCs with some match
      .sort((a, b) => b.match_score - a.match_score) // Sort by score descending
      .slice(0, 10); // Get top 10 matches

    // If no good matches found, get random VCs as fallback
    let finalMatches = scoredMatches;
    if (finalMatches.length === 0) {
      console.log('No scored matches found, using fallback strategy');
      finalMatches = (allVCs || [])
        .slice(0, 5)
        .map(vc => ({
          ...vc,
          match_score: 0,
          match_reasons: ['General VC match']
        }));
    }

    console.log('Found VC matches:', finalMatches.length);
    console.log('Top match scores:', finalMatches.slice(0, 3).map(m => ({ name: m.fund_name, score: m.match_score })));

    const matches: VCMatch[] = finalMatches;

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