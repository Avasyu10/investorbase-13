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

    // Enhanced personalized matching with AI-generated reasons
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    const scoredVCs = await Promise.all(allVCs.map(async (vc) => {
      let score = 0;
      let matchFactors = [];
      const vcSectors = vc['Sectors of Investments - Overall'] || '';
      const vcStages = vc['Stages of Entry - Overall'] || '';
      const vcLocations = vc['Locations of Investment - Overall'] || '';
      const portfolioCount = vc['Portfolio Count - Overall'] || 0;
      const vcContact = vccontactRecords?.find(contact => 
        contact['Investor Name'] === vc['Investor Name']
      );

      // Advanced sector matching with nuanced scoring
      let sectorScore = 0;
      if (sectorsList.length > 0 && vcSectors) {
        for (const companySector of sectorsList) {
          const sectorLower = companySector.toLowerCase();
          const vcSectorsLower = vcSectors.toLowerCase();
          
          // Exact sector match - highest weight
          if (vcSectorsLower.includes(sectorLower)) {
            sectorScore = Math.max(sectorScore, 35);
            matchFactors.push(`${companySector} specialist`);
          }
          // Related sector matching with specific logic
          else if (sectorLower.includes('tech') && (vcSectorsLower.includes('technology') || vcSectorsLower.includes('software'))) {
            sectorScore = Math.max(sectorScore, 25);
            matchFactors.push(`Technology sector focus`);
          }
          else if (sectorLower.includes('enterprise') && (vcSectorsLower.includes('b2b') || vcSectorsLower.includes('saas') || vcSectorsLower.includes('enterprise'))) {
            sectorScore = Math.max(sectorScore, 20);
            matchFactors.push(`Enterprise/B2B expertise`);
          }
          else if (sectorLower.includes('security') && vcSectorsLower.includes('security')) {
            sectorScore = Math.max(sectorScore, 30);
            matchFactors.push(`Security sector expertise`);
          }
        }
      }
      score += sectorScore;

      // Advanced stage matching with proximity logic
      let stageScore = 0;
      if (stagesList.length > 0 && vcStages) {
        for (const companyStage of stagesList) {
          const stageLower = companyStage.toLowerCase();
          const vcStagesLower = vcStages.toLowerCase();
          
          if (vcStagesLower.includes(stageLower)) {
            stageScore = Math.max(stageScore, 25);
            matchFactors.push(`${companyStage} stage expert`);
          }
          // Adjacent stage matching
          else if (stageLower.includes('seed') && (vcStagesLower.includes('early') || vcStagesLower.includes('pre-seed'))) {
            stageScore = Math.max(stageScore, 15);
            matchFactors.push(`Early-stage specialist`);
          }
          else if (stageLower.includes('series a') && (vcStagesLower.includes('growth') || vcStagesLower.includes('expansion'))) {
            stageScore = Math.max(stageScore, 15);
            matchFactors.push(`Growth capital provider`);
          }
        }
      }
      score += stageScore;

      // Portfolio activity scoring (0-15 points) - more nuanced
      if (portfolioCount > 200) {
        score += 15;
        matchFactors.push(`Super active (${portfolioCount} companies)`);
      } else if (portfolioCount > 100) {
        score += 12;
        matchFactors.push(`Very active investor`);
      } else if (portfolioCount > 50) {
        score += 8;
        matchFactors.push(`Active portfolio`);
      } else if (portfolioCount > 20) {
        score += 5;
        matchFactors.push(`Experienced investor`);
      }

      // Investment score bonus (0-10 points)
      const investmentScore = vcContact?.['Investment Score'] || 0;
      if (investmentScore > 80) {
        score += 10;
        matchFactors.push(`Top-tier track record`);
      } else if (investmentScore > 70) {
        score += 7;
        matchFactors.push(`Strong track record`);
      } else if (investmentScore > 50) {
        score += 4;
        matchFactors.push(`Good performance`);
      }

      // Contact availability bonus (0-5 points)
      if (vcContact?.['Emails'] && vcContact?.['Phone Numbers']) {
        score += 5;
        matchFactors.push(`Full contact details`);
      } else if (vcContact?.['Emails']) {
        score += 3;
        matchFactors.push(`Email available`);
      }

      // Calculate final percentage with variance to avoid identical scores
      const basePercentage = Math.min(Math.round((score / 100) * 100), 92);
      const variance = Math.floor(Math.random() * 6) - 3; // -3 to +3 variance
      const matchPercentage = Math.max(Math.min(basePercentage + variance, 95), 15);

      // Generate unique AI-powered match reason
      let matchReason = 'Investment alignment';
      
      if (geminiApiKey && matchFactors.length > 0) {
        try {
          const vcName = vc['Investor Name'];
          const prompt = `Write a compelling 40-60 character match reason for "${vcName}" investing in a ${companySectors} company. Key strengths: ${matchFactors.slice(0, 3).join(', ')}. Be specific and confident.`;
          
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                maxOutputTokens: 40, 
                temperature: 0.8,
                topP: 0.9
              }
            })
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const aiReason = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (aiReason && aiReason.length >= 20 && aiReason.length <= 80) {
              matchReason = aiReason.replace(/['"]/g, '');
            }
          }
        } catch (error) {
          console.log('Gemini API error for', vc['Investor Name'], ':', error);
        }
      }
      
      // Fallback to manual reason if AI didn't work
      if (matchReason === 'Investment alignment' && matchFactors.length > 0) {
        const topFactors = matchFactors.slice(0, 2);
        matchReason = topFactors.join(' + ');
      }

      return { 
        ...vc, 
        score, 
        matchPercentage, 
        matchReason,
        vccontact: vcContact
      };
    }));

    const filteredAndSortedVCs = scoredVCs
      .filter(vc => vc.score > 10) // Only include VCs with meaningful match
      .sort((a, b) => {
        // Sort by score first, then by portfolio count as tiebreaker
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (b['Portfolio Count - Overall'] || 0) - (a['Portfolio Count - Overall'] || 0);
      })
      .slice(0, 10); // Top 10 matches

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