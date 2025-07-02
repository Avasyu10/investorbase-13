

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fixed user ID for all deck uploads
const FIXED_USER_ID = "a3808d4b-6ae3-44e3-be54-afcff6779df7";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // Insert data into the bitsanalysis table
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

    let companyId = null;

    // Process analysis_result if provided
    if (analysis_result && typeof analysis_result === 'object') {
      console.log('Processing analysis result for deck:', deck_name)

      try {
        // Extract company name from analysis_result.companyInfo.name, fallback to deck_name
        const companyName = analysis_result.companyInfo?.name || deck_name;
        const companyStage = analysis_result.companyInfo?.stage || null;
        const companyIndustry = analysis_result.companyInfo?.industry || null;
        const companyWebsite = analysis_result.companyInfo?.website || null;
        const companyDescription = analysis_result.companyInfo?.description || null;

        console.log('Extracted company info:', {
          name: companyName,
          stage: companyStage,
          industry: companyIndustry,
          website: companyWebsite
        });

        // Create company record with extracted company information
        const { data: company, error: companyError } = await supabaseClient
          .from('companies')
          .insert([{
            name: companyName,
            overall_score: analysis_result.overallScore || 0,
            assessment_points: analysis_result.assessmentPoints || [],
            user_id: FIXED_USER_ID,
            source: 'deck_upload',
            industry: companyIndustry,
            // Store additional company info in a structured way
            response_received: companyDescription ? JSON.stringify({
              stage: companyStage,
              website: companyWebsite,
              description: companyDescription
            }) : null
          }])
          .select()
          .single();
        
        if (companyError) {
          console.error("Error creating company:", companyError);
          throw companyError;
        }
        
        companyId = company.id;
        console.log("Company created with extracted name:", companyName, "ID:", companyId);
        
        // Save sections if they exist
        if (analysis_result.sections && analysis_result.sections.length > 0) {
          console.log("Saving sections:", analysis_result.sections.length);
          
          for (const section of analysis_result.sections) {
            // Insert section
            const { data: savedSection, error: sectionError } = await supabaseClient
              .from('sections')
              .insert([{
                company_id: companyId,
                title: section.title,
                type: section.type,
                score: section.score || 0,
                description: section.description || ''
              }])
              .select()
              .single();
            
            if (sectionError) {
              console.error("Error saving section:", sectionError);
              continue; // Continue with other sections
            }
            
            // Save section details (strengths and weaknesses)
            const details = [];
            
            if (section.strengths && Array.isArray(section.strengths)) {
              for (const strength of section.strengths) {
                details.push({
                  section_id: savedSection.id,
                  detail_type: 'strength',
                  content: strength
                });
              }
            }
            
            if (section.weaknesses && Array.isArray(section.weaknesses)) {
              for (const weakness of section.weaknesses) {
                details.push({
                  section_id: savedSection.id,
                  detail_type: 'weakness',
                  content: weakness
                });
              }
            }
            
            if (details.length > 0) {
              const { error: detailsError } = await supabaseClient
                .from('section_details')
                .insert(details);
              
              if (detailsError) {
                console.error("Error saving section details:", detailsError);
              }
            }
          }
        }
        
        console.log("Analysis processing completed successfully");
      } catch (analysisError) {
        console.error('Error processing analysis result:', analysisError);
        // Don't fail the entire operation, just log the error
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

