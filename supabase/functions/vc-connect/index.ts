import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VCContactMatch {
  'SNo.': number;
  'Investor Name': string;
  'Overview': string;
  'Founded Year': number;
  'State': string;
  'City': string;
  'Description': string;
  'Investor Type': string;
  'Practice Areas': string;
  'Investment Score': number;
  'Emails': string;
  'Phone Numbers': string;
  'Website': string;
  'LinkedIn': string;
  'Twitter': string;
  match_score?: number;
  match_reasons?: string[];
}

interface VCConnectRequest {
  companyId: string;
  companyStage?: string;
  companyIndustry?: string;
  minInvestmentScore?: number;
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

    const { companyId, companyStage, companyIndustry, minInvestmentScore = 50 }: VCConnectRequest = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing VC connect for company:', companyId);

    // Get company details if stage/industry not provided
    let stage = companyStage;
    let industry = companyIndustry;

    if (!stage || !industry) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('report_id, overall_score')
        .eq('id', companyId)
        .single();

      if (company?.report_id) {
        const { data: report } = await supabase
          .from('reports')
          .select('analysis_result')
          .eq('id', company.report_id)
          .single();

        if (report?.analysis_result) {
          const analysisResult = report.analysis_result as any;
          const companyInfo = analysisResult?.company_Info || analysisResult?.companyInfo || {};
          stage = stage || companyInfo.stage || companyInfo.funding_stage;
          industry = industry || companyInfo.industry || companyInfo.sector;
        }
      }
    }

    console.log('Company stage:', stage);
    console.log('Company industry:', industry);

    // Enhanced matching algorithms
    const normalizeIndustry = (industry: string): string[] => {
      if (!industry) return [];
      
      const variations = [industry.toLowerCase()];
      const industryMap: Record<string, string[]> = {
        'fintech': ['fintech', 'financial technology', 'finance', 'payments', 'banking', 'financial services'],
        'saas': ['saas', 'software as a service', 'enterprise software', 'b2b software', 'cloud', 'software'],
        'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'ai-ml', 'deep learning', 'data science'],
        'healthcare': ['healthcare', 'health tech', 'biotech', 'medical', 'pharma', 'life sciences'],
        'cybersecurity': ['cybersecurity', 'security', 'cyber security', 'infosec', 'data security'],
        'edtech': ['edtech', 'education technology', 'education', 'learning', 'online learning'],
        'blockchain': ['blockchain', 'crypto', 'web3', 'defi', 'cryptocurrency'],
        'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'online retail'],
        'mobility': ['mobility', 'transportation', 'automotive', 'logistics', 'supply chain'],
        'energy': ['energy', 'cleantech', 'renewable energy', 'sustainability', 'clean tech'],
        'real estate': ['real estate', 'proptech', 'property', 'construction', 'real-estate'],
        'food': ['food tech', 'agtech', 'agriculture', 'food', 'agri'],
        'gaming': ['gaming', 'game', 'entertainment', 'media', 'digital entertainment']
      };
      
      for (const [key, values] of Object.entries(industryMap)) {
        if (values.some(v => industry.toLowerCase().includes(v))) {
          variations.push(...values, key);
        }
      }
      return [...new Set(variations)];
    };

    const calculateMatchScore = (vc: VCContactMatch, companyStage?: string, companyIndustry?: string): { score: number, reasons: string[] } => {
      let score = 0;
      const reasons: string[] = [];
      
      // Investment Score (30% weight)
      if (vc['Investment Score'] && vc['Investment Score'] >= minInvestmentScore) {
        const scoreBonus = Math.min(30, (vc['Investment Score'] - minInvestmentScore) / 2);
        score += scoreBonus;
        reasons.push(`High investment score: ${vc['Investment Score']}`);
      }
      
      // Industry matching (40% weight)
      if (companyIndustry && vc['Practice Areas']) {
        const industryVariations = normalizeIndustry(companyIndustry);
        const practiceAreas = vc['Practice Areas'].toLowerCase();
        
        const industryMatch = industryVariations.some(variation => 
          practiceAreas.includes(variation)
        );
        
        if (industryMatch) {
          score += 40;
          reasons.push(`Invests in ${companyIndustry} sector`);
        }
      }
      
      // Contact completeness (20% weight)
      let contactScore = 0;
      if (vc['Emails'] && vc['Emails'].trim()) {
        contactScore += 8;
        reasons.push('Email available');
      }
      if (vc['Phone Numbers'] && vc['Phone Numbers'].trim()) {
        contactScore += 4;
      }
      if (vc['Website'] && vc['Website'].trim()) {
        contactScore += 4;
      }
      if (vc['LinkedIn'] && vc['LinkedIn'].trim()) {
        contactScore += 4;
      }
      score += contactScore;
      
      // Geographic preference (10% weight)
      if (vc['State'] && (vc['State'].includes('California') || vc['State'].includes('New York') || vc['State'].includes('London'))) {
        score += 10;
        reasons.push('Located in major investment hub');
      }
      
      return { score, reasons };
    };

    // Get VC contacts with comprehensive data
    const { data: vcContacts, error: vcError } = await supabase
      .from('vccontact')
      .select(`
        "SNo.",
        "Investor Name",
        "Overview",
        "Founded Year",
        "State",
        "City",
        "Description",
        "Investor Type",
        "Practice Areas",
        "Investment Score",
        "Emails",
        "Phone Numbers",
        "Website",
        "LinkedIn",
        "Twitter"
      `)
      .gte('Investment Score', minInvestmentScore)
      .not('Emails', 'is', null)
      .neq('Emails', '');

    if (vcError) {
      console.error('Error fetching VC contacts:', vcError);
      return new Response(JSON.stringify({ error: 'Error fetching VC contacts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Score and rank VCs
    const scoredMatches = (vcContacts || [])
      .map(vc => {
        const matchData = calculateMatchScore(vc, stage, industry);
        return {
          ...vc,
          match_score: matchData.score,
          match_reasons: matchData.reasons
        };
      })
      .filter(vc => vc.match_score > 10) // Only VCs with decent match
      .sort((a, b) => b.match_score - a.match_score) // Sort by score descending
      .slice(0, 20); // Get top 20 matches

    console.log('Found VC contacts:', scoredMatches.length);
    console.log('Top matches:', scoredMatches.slice(0, 3).map(m => ({ 
      name: m['Investor Name'], 
      score: m.match_score,
      email: m['Emails'],
      investment_score: m['Investment Score']
    })));

    return new Response(JSON.stringify({
      matches: scoredMatches,
      totalMatches: scoredMatches.length,
      searchCriteria: {
        companyStage: stage,
        companyIndustry: industry,
        minInvestmentScore
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in VC connect function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});