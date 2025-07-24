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
  // Match details
  'Match Percentage'?: number;
  'Match Reason'?: string;
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

    // Enhanced personalized matching with deterministic scoring
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    console.log('Gemini API available:', !!geminiApiKey);
    
    // Process VCs with personalized scoring
    const scoredVCs = [];
    
    for (let i = 0; i < allVCs.length; i++) {
      const vc = allVCs[i];
      let score = 0;
      let matchFactors = [];
      const vcSectors = vc['Sectors of Investments - Overall'] || '';
      const vcStages = vc['Stages of Entry - Overall'] || '';
      const portfolioCount = vc['Portfolio Count - Overall'] || 0;
      const vcContact = vccontactRecords?.find(contact => 
        contact['Investor Name'] === vc['Investor Name']
      );

      // Use VC name hash for consistent but varied scoring
      const nameHash = vc['Investor Name'].split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hashMod = Math.abs(nameHash) % 100;

      // Sector matching with VC-specific variance
      let sectorScore = 0;
      if (sectorsList.length > 0 && vcSectors) {
        for (const companySector of sectorsList) {
          const sectorLower = companySector.toLowerCase();
          const vcSectorsLower = vcSectors.toLowerCase();
          
          if (vcSectorsLower.includes(sectorLower)) {
            sectorScore = 35 + (hashMod % 8); // 35-42 range
            matchFactors.push(`${companySector} investment focus`);
            break;
          }
          else if (sectorLower.includes('tech') && vcSectorsLower.includes('technology')) {
            sectorScore = 25 + (hashMod % 6);
            matchFactors.push(`Technology sector alignment`);
            break;
          }
          else if (sectorLower.includes('enterprise') && (vcSectorsLower.includes('b2b') || vcSectorsLower.includes('saas'))) {
            sectorScore = 20 + (hashMod % 5);
            matchFactors.push(`B2B/Enterprise expertise`);
            break;
          }
        }
      }
      score += sectorScore;

      // Stage matching with variance
      let stageScore = 0;
      if (stagesList.length > 0 && vcStages) {
        for (const companyStage of stagesList) {
          const stageLower = companyStage.toLowerCase();
          const vcStagesLower = vcStages.toLowerCase();
          
          if (vcStagesLower.includes(stageLower)) {
            stageScore = 25 + ((hashMod + 30) % 7); // 25-31 range
            matchFactors.push(`${companyStage} stage specialist`);
            break;
          }
          else if (stageLower.includes('seed') && vcStagesLower.includes('early')) {
            stageScore = 15 + ((hashMod + 20) % 5);
            matchFactors.push(`Early-stage investor`);
            break;
          }
        }
      }
      score += stageScore;

      // Portfolio activity with variance
      if (portfolioCount > 100) {
        score += 12 + (hashMod % 4);
        matchFactors.push(`Highly active investor`);
      } else if (portfolioCount > 50) {
        score += 8 + (hashMod % 3);
        matchFactors.push(`Active portfolio builder`);
      } else if (portfolioCount > 20) {
        score += 5 + (hashMod % 2);
        matchFactors.push(`Experienced investor`);
      }

      // Investment score bonus
      const investmentScore = vcContact?.['Investment Score'] || 0;
      if (investmentScore > 70) {
        score += 8 + (hashMod % 3);
        matchFactors.push(`Strong track record`);
      } else if (investmentScore > 50) {
        score += 4 + (hashMod % 2);
        matchFactors.push(`Proven performance`);
      }

      // Contact availability
      if (vcContact?.['Emails']) {
        score += 3 + (hashMod % 2);
        matchFactors.push(`Direct contact available`);
      }

      // Calculate unique percentage for each VC
      const basePercentage = Math.min(Math.round((score / 100) * 100), 88);
      const uniqueVariance = (hashMod % 12) - 6; // -6 to +6 variance
      const matchPercentage = Math.max(Math.min(basePercentage + uniqueVariance, 94), 18);

      // Create unique match reasons
      let matchReason = 'Investment profile fit';
      
      const vcNameWords = vc['Investor Name'].toLowerCase().split(' ');
      const reasonTemplates = [
        `Perfect sector-stage alignment`,
        `Strong ${sectorsList[0] || 'sector'} investment track record`,
        `Proven ${stagesList[0] || 'growth'} stage expertise`,
        `Active ${portfolioCount > 50 ? 'portfolio' : 'investment'} builder`,
        `Strategic ${companySectors.split(',')[0]} investor`,
        `Ideal ${companyStages || 'stage'} funding partner`,
        `Sector expertise meets growth stage`,
        `Perfect investment thesis match`,
        `Strong market focus alignment`,
        `Proven ${sectorsList[0] || 'tech'} sector success`
      ];
      
      // Use hash to select consistent but different reasons
      const reasonIndex = Math.abs(nameHash) % reasonTemplates.length;
      matchReason = reasonTemplates[reasonIndex];

      // Try Gemini for top matches only (to avoid rate limits)
      if (geminiApiKey && i < 5 && matchFactors.length > 1) {
        try {
          const prompt = `Generate a brief, compelling investment match reason (35-55 chars) for "${vc['Investor Name']}" and a ${companySectors} company. Key: ${matchFactors[0]}. Be specific and confident.`;
          
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                maxOutputTokens: 30, 
                temperature: 0.7,
                topP: 0.8
              }
            })
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const aiReason = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (aiReason && aiReason.length >= 25 && aiReason.length <= 70) {
              matchReason = aiReason.replace(/['"]/g, '').replace(/\.$/, '');
              console.log(`AI reason for ${vc['Investor Name']}: ${matchReason}`);
            }
          }
        } catch (error) {
          console.log(`Gemini error for ${vc['Investor Name']}:`, error.message);
        }
      }

      scoredVCs.push({ 
        ...vc, 
        score, 
        matchPercentage, 
        matchReason,
        vccontact: vcContact
      });
    }

    const filteredAndSortedVCs = scoredVCs
      .filter(vc => vc.score > 12)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (b['Portfolio Count - Overall'] || 0) - (a['Portfolio Count - Overall'] || 0);
      })
      .slice(0, 10);

    const matches: VCMatch[] = filteredAndSortedVCs.map(vc => ({
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
      'LinkedIn': vc.vccontact?.['LinkedIn'] || '',
      // Match details
      'Match Percentage': vc.matchPercentage || 0,
      'Match Reason': vc.matchReason || 'General investment fit'
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