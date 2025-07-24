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

    // AI-powered sophisticated matching with Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    console.log('Gemini API available:', !!geminiApiKey);
    
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ 
        error: 'AI matching service unavailable',
        matches: [],
        totalMatches: 0 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First, do basic filtering and scoring
    const preFilteredVCs = allVCs.map(vc => {
      let preliminaryScore = 0;
      const vcSectors = vc['Sectors of Investments - Overall'] || '';
      const vcStages = vc['Stages of Entry - Overall'] || '';
      const portfolioCount = vc['Portfolio Count - Overall'] || 0;
      const vcContact = vccontactRecords?.find(contact => 
        contact['Investor Name'] === vc['Investor Name']
      );

      // Basic sector relevance check
      if (sectorsList.length > 0 && vcSectors) {
        for (const sector of sectorsList) {
          if (vcSectors.toLowerCase().includes(sector.toLowerCase())) {
            preliminaryScore += 40;
            break;
          }
        }
      }

      // Basic stage relevance check  
      if (stagesList.length > 0 && vcStages) {
        for (const stage of stagesList) {
          if (vcStages.toLowerCase().includes(stage.toLowerCase())) {
            preliminaryScore += 30;
            break;
          }
        }
      }

      // Portfolio activity points
      if (portfolioCount > 50) preliminaryScore += 20;
      else if (portfolioCount > 20) preliminaryScore += 10;

      // Contact availability
      if (vcContact?.['Emails']) preliminaryScore += 10;

      return { 
        ...vc, 
        preliminaryScore,
        vccontact: vcContact
      };
    })
    .filter(vc => vc.preliminaryScore > 25) // Only process promising matches
    .sort((a, b) => b.preliminaryScore - a.preliminaryScore)
    .slice(0, 15); // Get top 15 for AI processing

    console.log(`Processing ${preFilteredVCs.length} VCs with AI matching`);

    // Process each VC with Gemini AI for detailed analysis
    const aiProcessedVCs = [];
    
    for (let i = 0; i < Math.min(preFilteredVCs.length, 10); i++) {
      const vc = preFilteredVCs[i];
      
      try {
        // Prepare comprehensive VC profile for AI analysis
        const vcProfile = {
          name: vc['Investor Name'],
          sectors: vc['Sectors of Investments - Overall'] || 'Not specified',
          stages: vc['Stages of Entry - Overall'] || 'Not specified',
          portfolioCount: vc['Portfolio Count - Overall'] || 0,
          locations: vc['Locations of Investment - Overall'] || 'Not specified',
          ipos: vc['Portfolio IPOs - Overall'] || 'None listed',
          investmentScore: vc.vccontact?.['Investment Score'] || 'Not available',
          founded: vc.vccontact?.['Founded Year'] || 'Not available',
          city: vc.vccontact?.['City'] || 'Not specified',
          description: vc.vccontact?.['Description'] || 'No description available',
          hasEmail: !!vc.vccontact?.['Emails'],
          hasPhone: !!vc.vccontact?.['Phone Numbers']
        };

        // Create detailed prompt for AI analysis
        const analysisPrompt = `
You are an expert venture capital matching analyst. Analyze this VC-startup fit:

STARTUP PROFILE:
- Company: ${companyData.name}
- Sectors: ${companySectors}
- Investment Stages: ${companyStages || 'Not specified'}
- Analysis: ${JSON.stringify(analysisResult.companyInfo || {}).substring(0, 500)}

VC PROFILE:
- Name: ${vcProfile.name}
- Investment Sectors: ${vcProfile.sectors}
- Investment Stages: ${vcProfile.stages}
- Portfolio Size: ${vcProfile.portfolioCount} companies
- Geographic Focus: ${vcProfile.locations}
- Notable IPOs: ${vcProfile.ipos}
- Investment Score: ${vcProfile.investmentScore}
- Founded: ${vcProfile.founded}
- Description: ${vcProfile.description}
- Contact Available: Email(${vcProfile.hasEmail}), Phone(${vcProfile.hasPhone})

TASK: Provide a JSON response with:
1. "matchPercentage": Integer 0-95 based on sector alignment, stage fit, portfolio relevance, geographic proximity, track record, and accessibility
2. "explanation": 120-180 character detailed explanation of why this is a good match, focusing on specific alignment factors

Example format:
{
  "matchPercentage": 78,
  "explanation": "Strong enterprise software focus with 15+ SaaS investments, active in Series A rounds, proven track record with 3 successful exits in security sector, and direct contact available."
}

Be specific, accurate, and highlight the most compelling match factors.`;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: analysisPrompt }] }],
            generationConfig: { 
              maxOutputTokens: 200, 
              temperature: 0.3,
              topP: 0.8
            }
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          
          if (aiResponse) {
            try {
              // Extract JSON from AI response
              const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsedResponse = JSON.parse(jsonMatch[0]);
                
                if (parsedResponse.matchPercentage && parsedResponse.explanation) {
                  aiProcessedVCs.push({
                    ...vc,
                    score: parsedResponse.matchPercentage,
                    matchPercentage: Math.min(Math.max(parsedResponse.matchPercentage, 15), 95),
                    matchReason: parsedResponse.explanation.substring(0, 200)
                  });
                  
                  console.log(`AI processed ${vc['Investor Name']}: ${parsedResponse.matchPercentage}% - ${parsedResponse.explanation.substring(0, 50)}...`);
                  continue;
                }
              }
            } catch (parseError) {
              console.log(`JSON parse error for ${vc['Investor Name']}:`, parseError.message);
            }
          }
        }
        
        // Fallback if AI processing fails
        console.log(`Fallback processing for ${vc['Investor Name']}`);
        
      } catch (error) {
        console.log(`AI processing error for ${vc['Investor Name']}:`, error.message);
      }
      
      // Fallback scoring if AI fails
      let fallbackScore = vc.preliminaryScore;
      let fallbackReason = "Investment profile shows alignment with company sector and stage requirements";
      
      // Enhanced fallback logic
      if (sectorsList.some(s => vc['Sectors of Investments - Overall']?.toLowerCase().includes(s.toLowerCase()))) {
        fallbackReason = `Strong sector alignment in ${sectorsList[0]} with proven investment track record`;
        fallbackScore += 10;
      }
      
      if (stagesList.some(s => vc['Stages of Entry - Overall']?.toLowerCase().includes(s.toLowerCase()))) {
        fallbackReason += ` and active ${stagesList[0]} stage investment experience`;
        fallbackScore += 8;
      }

      const fallbackPercentage = Math.min(Math.max(Math.round(fallbackScore * 0.8), 20), 85);
      
      aiProcessedVCs.push({
        ...vc,
        score: fallbackScore,
        matchPercentage: fallbackPercentage,
        matchReason: fallbackReason
      });
    }

    // Sort by match percentage and return top 10
    const filteredAndSortedVCs = aiProcessedVCs
      .sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return (b['Portfolio Count - Overall'] || 0) - (a['Portfolio Count - Overall'] || 0);
      })
      .slice(0, 10);

    console.log(`Returning ${filteredAndSortedVCs.length} AI-matched VCs`);

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