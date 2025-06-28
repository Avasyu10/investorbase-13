
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    const { deck_name, analysis_result } = await req.json()

    if (!deck_name) {
      return new Response(
        JSON.stringify({ error: 'deck_name is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing deck:', deck_name)

    // Insert data into the bitsanalysis table first
    const { data: bitsData, error: bitsError } = await supabaseClient
      .from('bitsanalysis')
      .insert({
        deck_name,
        analysis_result: analysis_result || null
      })
      .select()
      .single()

    if (bitsError) {
      console.error('Error inserting into bitsanalysis:', bitsError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload deck data', details: bitsError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully uploaded to bitsanalysis:', bitsData)

    // If analysis_result is provided, process it into companies, sections, and section_details
    let companyId = null;
    
    if (analysis_result && typeof analysis_result === 'object') {
      try {
        // Fixed user ID as specified
        const effectiveUserId = "a3808d4b-6ae3-44e3-be54-afcff6779df7";
        
        // Create company entry
        const companyData = {
          name: deck_name,
          overall_score: analysis_result.overall_score || 0,
          scoring_reason: analysis_result.scoring_reason || '',
          assessment_points: analysis_result.summary?.assessment_points || [],
          user_id: effectiveUserId,
          source: 'upload_deck',
          industry: analysis_result.company_info?.industry || null,
        };

        const { data: newCompany, error: companyError } = await supabaseClient
          .from('companies')
          .insert(companyData)
          .select()
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error(`Failed to create company: ${companyError.message}`);
        }

        companyId = newCompany.id;
        console.log('Successfully created company with ID:', companyId);

        // Create sections if they exist in the analysis result
        if (analysis_result.sections && typeof analysis_result.sections === 'object') {
          // Section mapping similar to analyze-eureka-form
          const sectionMapping = {
            'problem_solution_fit': 'Problem & Solution',
            'target_customers': 'Target Customers', 
            'competitors': 'Competitors',
            'revenue_model': 'Revenue Model',
            'differentiation': 'Differentiation'
          };

          const sectionsToCreate = Object.entries(analysis_result.sections).map(([sectionKey, sectionData]: [string, any]) => ({
            company_id: companyId,
            score: sectionData.score || 0,
            section_type: sectionKey,
            type: 'analysis',
            title: sectionMapping[sectionKey as keyof typeof sectionMapping] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: sectionData.analysis || sectionData.description || ''
          }));

          if (sectionsToCreate.length > 0) {
            const { data: createdSections, error: sectionsError } = await supabaseClient
              .from('sections')
              .insert(sectionsToCreate)
              .select();

            if (sectionsError) {
              console.error('Error creating sections:', sectionsError);
              throw new Error(`Failed to create sections: ${sectionsError.message}`);
            }

            console.log('Created sections:', createdSections.length);

            // Create section details (strengths and weaknesses)
            const sectionDetails = [];
            
            for (const section of createdSections) {
              const sectionKey = section.section_type;
              const sectionData = analysis_result.sections[sectionKey];
              
              if (sectionData) {
                // Add strengths
                if (sectionData.strengths && Array.isArray(sectionData.strengths)) {
                  for (const strength of sectionData.strengths) {
                    sectionDetails.push({
                      section_id: section.id,
                      detail_type: 'strength',
                      content: strength
                    });
                  }
                }
                
                // Add improvements/weaknesses
                if (sectionData.improvements && Array.isArray(sectionData.improvements)) {
                  for (const improvement of sectionData.improvements) {
                    sectionDetails.push({
                      section_id: section.id,
                      detail_type: 'weakness',
                      content: improvement
                    });
                  }
                }

                // Add weaknesses if they exist instead of improvements
                if (sectionData.weaknesses && Array.isArray(sectionData.weaknesses)) {
                  for (const weakness of sectionData.weaknesses) {
                    sectionDetails.push({
                      section_id: section.id,
                      detail_type: 'weakness',
                      content: weakness
                    });
                  }
                }
              }
            }

            if (sectionDetails.length > 0) {
              const { error: detailsError } = await supabaseClient
                .from('section_details')
                .insert(sectionDetails);

              if (detailsError) {
                console.error('Error creating section details:', detailsError);
                throw new Error(`Failed to create section details: ${detailsError.message}`);
              }

              console.log('Created section details:', sectionDetails.length);
            }
          }
        }

        console.log('Successfully processed analysis result and created company structure');

      } catch (processingError) {
        console.error('Error processing analysis result:', processingError);
        // Don't fail the entire request if analysis processing fails
        // The bitsanalysis entry was already created successfully
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deck uploaded successfully',
        data: bitsData,
        companyId: companyId
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in upload_deck function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
