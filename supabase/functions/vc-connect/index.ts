import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VCMatchRequest {
  companyId: string;
}

interface VCMatch {
  id?: string;
  'Investor Name': string;
  'Sectors of Investments - Overall': string;
  'Stages of Entry - Overall': string;
  'Portfolio Count - Overall': number;
  'Locations of Investment - Overall': string;
  'Portfolio IPOs - Overall': string;
  // From vccontact table
  'Founded Year'?: number;
  'City'?: string;
  'Description'?: string;
  'Investment Score'?: number;
  'Emails'?: string;
  'Phone Numbers'?: string;
  'Website'?: string;
  'LinkedIn'?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { companyId }: VCMatchRequest = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing VC matching request for company: ${companyId}`);

    // Fetch company data and analysis
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id, name, report_id')
      .eq('id', companyId)
      .single();

    if (companyError || !companyData) {
      console.error('Company not found:', companyError);
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the analysis result from the report
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('analysis_result')
      .eq('id', companyData.report_id)
      .single();

    if (reportError || !reportData?.analysis_result) {
      console.error('Report analysis not found:', reportError);
      return new Response(JSON.stringify({ error: 'Company analysis not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysisResult = reportData.analysis_result;
    
    // Extract company sectors and stages from analysis
    const companySectors = analysisResult.companyInfo?.sectors || '';
    const companyStages = analysisResult.companyInfo?.investmentStages || '';

    console.log('Company sectors:', companySectors);
    console.log('Company stages:', companyStages);

    if (!companySectors && !companyStages) {
      return new Response(JSON.stringify({ 
        error: 'No sectors or stages data found in company analysis',
        matches: [],
        totalMatches: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert sectors and stages to arrays for matching
    const sectorsList = companySectors ? companySectors.split(',').map(s => s.trim()) : [];
    const stagesList = companyStages ? companyStages.split(',').map(s => s.trim()) : [];

    // Query VCs from vcdata table
    const { data: vcdataRecords, error: vcError } = await supabase
      .from('vcdata')
      .select('*')
      .limit(100);

    if (vcError) {
      console.error('Error fetching VC data:', vcError);
      return new Response(JSON.stringify({ error: 'Failed to fetch VC data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get corresponding vccontact data
    const investorNames = vcdataRecords?.map(vc => vc['Investor Name']).filter(Boolean) || [];
    
    const { data: vccontactRecords, error: contactError } = await supabase
      .from('vccontact')
      .select('*')
      .in('Investor Name', investorNames);

    if (contactError) {
      console.log('Warning: Could not fetch VC contact data:', contactError);
    }

    // Merge the data
    const allVCs = vcdataRecords?.map(vcdata => {
      const contact = vccontactRecords?.find(contact => 
        contact['Investor Name'] === vcdata['Investor Name']
      );
      return {
        ...vcdata,
        vccontact: contact || null
      };
    }) || [];


    if (!allVCs || allVCs.length === 0) {
      return new Response(JSON.stringify({ 
        matches: [], 
        totalMatches: 0,
        companySectors,
        companyStages 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Score and filter VCs based on sector and stage matching
    const scoredVCs = allVCs.map(vc => {
      let score = 0;
      const vcSectors = vc['Sectors of Investments - Overall'] || '';
      const vcStages = vc['Stages of Entry - Overall'] || '';

      // Sector matching (50% weight)
      if (sectorsList.length > 0 && vcSectors) {
        for (const companySector of sectorsList) {
          if (vcSectors.toLowerCase().includes(companySector.toLowerCase())) {
            score += 50;
            break; // Only count once per VC
          }
        }
      }

      // Stage matching (50% weight)
      if (stagesList.length > 0 && vcStages) {
        for (const companyStage of stagesList) {
          if (vcStages.toLowerCase().includes(companyStage.toLowerCase())) {
            score += 50;
            break; // Only count once per VC
          }
        }
      }

      return { ...vc, score };
    })
    .filter(vc => vc.score > 0) // Only include VCs with some match
    .sort((a, b) => {
      // Sort by score first, then by portfolio count as tiebreaker
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (b['Portfolio Count - Overall'] || 0) - (a['Portfolio Count - Overall'] || 0);
    })
    .slice(0, 10); // Top 10 matches

    const matches: VCMatch[] = scoredVCs.map(vc => ({
      id: vc.id || vc.vccontact?.id || `vc_${vc['Investor Name']?.replace(/\s+/g, '_').toLowerCase()}`,
      'Investor Name': vc['Investor Name'] || '',
      'Sectors of Investments - Overall': vc['Sectors of Investments - Overall'] || '',
      'Stages of Entry - Overall': vc['Stages of Entry - Overall'] || '',
      'Portfolio Count - Overall': vc['Portfolio Count - Overall'] || 0,
      'Locations of Investment - Overall': vc['Locations of Investment - Overall'] || '',
      'Portfolio IPOs - Overall': vc['Portfolio IPOs - Overall'] || '',
      // Include vccontact data
      'Founded Year': vc.vccontact?.['Founded Year'] || null,
      'City': vc.vccontact?.['City'] || '',
      'Description': vc.vccontact?.['Description'] || '',
      'Investment Score': vc.vccontact?.['Investment Score'] || null,
      'Emails': vc.vccontact?.['Emails'] || '',
      'Phone Numbers': vc.vccontact?.['Phone Numbers'] || '',
      'Website': vc.vccontact?.['Website'] || '',
      'LinkedIn': vc.vccontact?.['LinkedIn'] || ''
    }));

    console.log(`Found ${matches.length} matching VCs for company ${companyData.name}`);

    return new Response(JSON.stringify({
      matches,
      totalMatches: matches.length,
      companySectors,
      companyStages,
      companyName: companyData.name
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vc-connect function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      matches: [],
      totalMatches: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});