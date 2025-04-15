
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function saveAnalysisResults(
  supabase: any,
  analysis: any,
  report: any
): Promise<string> {
  console.log("[databaseService] Starting to save analysis results to database");
  console.log("[databaseService] Analysis data:", {
    companyName: analysis.companyName,
    overallScore: analysis.overallScore,
    assessmentPointsCount: (analysis.assessmentPoints || []).length,
    sectionsCount: (analysis.sections || []).length,
  });
  console.log("[databaseService] Report data:", {
    id: report.id,
    title: report.title,
    is_public_submission: report.is_public_submission,
    user_id: report.user_id,
  });
  
  try {
    // First, create the company record
    const companyData = {
      name: analysis.companyName || report.title,
      overall_score: analysis.overallScore || 0,
      assessment_points: analysis.assessmentPoints || [],
      report_id: report.id,
      // Determine the source based on if it's a public submission
      source: report.is_public_submission ? 'public_url' : 'dashboard',
      // Important: Use the report's user_id which should be the form owner's ID
      user_id: report.user_id
    };
    
    console.log("[databaseService] Creating company record with data:", {
      ...companyData,
      assessment_points: `${companyData.assessment_points.length} items`,
    });
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();
    
    if (companyError) {
      console.error("[databaseService] Error creating company:", companyError);
      throw companyError;
    }
    
    if (!company) {
      console.error("[databaseService] Company data is null after insert");
      throw new Error("Failed to create company record");
    }
    
    console.log(`[databaseService] Created company: ${company.id}, name: ${company.name}`);
    
    // Update the report to link it to the company
    console.log(`[databaseService] Updating report ${report.id} with company_id ${company.id}`);
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({ 
        company_id: company.id,
        analysis_status: 'completed'
      })
      .eq('id', report.id);
    
    if (reportUpdateError) {
      console.error("[databaseService] Error updating report:", reportUpdateError);
      throw reportUpdateError;
    }
    
    console.log("[databaseService] Successfully updated report with company_id");
    
    // Create sections for each category in the analysis
    if (analysis.sections && Array.isArray(analysis.sections)) {
      console.log(`[databaseService] Creating ${analysis.sections.length} sections for company ${company.id}`);
      
      // We'll use the service role to bypass RLS policies
      const adminApiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const apiUrl = Deno.env.get('SUPABASE_URL') || '';
      
      if (!adminApiKey || !apiUrl) {
        console.error("[databaseService] Missing admin credentials for section creation");
        console.error(`[databaseService] SUPABASE_SERVICE_ROLE_KEY exists: ${!!adminApiKey}, SUPABASE_URL exists: ${!!apiUrl}`);
        throw new Error("Missing admin credentials");
      }
      
      // Create a new client with the service role key to bypass RLS
      const adminSupabase = createClient(apiUrl, adminApiKey);
      
      try {
        // Insert all sections in a batch
        const sectionsToInsert = analysis.sections.map((section: any) => ({
          company_id: company.id,
          type: section.type || 'GENERIC',
          title: section.title || 'Untitled Section',
          description: section.description || '',
          score: section.score || 0
        }));
        
        console.log("[databaseService] Sections to insert:", sectionsToInsert.map((s: any) => ({
          title: s.title,
          type: s.type,
          score: s.score
        })));
        
        const { data: sections, error: sectionsError } = await adminSupabase
          .from('sections')
          .insert(sectionsToInsert)
          .select();
        
        if (sectionsError) {
          console.error("[databaseService] Error creating sections:", sectionsError);
          throw sectionsError;
        }
        
        // Now insert all details for each section
        if (sections && sections.length > 0) {
          console.log(`[databaseService] Successfully created ${sections.length} sections`);
          
          // Create a mapping of section title to section ID
          const sectionMap = new Map();
          sections.forEach((section: any) => {
            sectionMap.set(section.title, section.id);
            console.log(`[databaseService] Mapping section '${section.title}' to ID ${section.id}`);
          });
          
          // Prepare all details to insert in one batch
          const detailsToInsert: any[] = [];
          
          analysis.sections.forEach((section: any) => {
            const sectionId = sectionMap.get(section.title);
            
            if (!sectionId) {
              console.warn(`[databaseService] Could not find section ID for title: ${section.title}`);
              console.warn("[databaseService] Available section titles in map:", Array.from(sectionMap.keys()));
              return;
            }
            
            // Add strengths
            if (section.strengths && Array.isArray(section.strengths)) {
              section.strengths.forEach((strength: string) => {
                detailsToInsert.push({
                  section_id: sectionId,
                  detail_type: 'strength',
                  content: strength
                });
              });
            }
            
            // Add weaknesses
            if (section.weaknesses && Array.isArray(section.weaknesses)) {
              section.weaknesses.forEach((weakness: string) => {
                detailsToInsert.push({
                  section_id: sectionId,
                  detail_type: 'weakness',
                  content: weakness
                });
              });
            }
          });
          
          if (detailsToInsert.length > 0) {
            console.log(`[databaseService] Inserting ${detailsToInsert.length} section details`);
            
            const { data: details, error: detailsError } = await adminSupabase
              .from('section_details')
              .insert(detailsToInsert)
              .select();
            
            if (detailsError) {
              console.error("[databaseService] Error creating section details:", detailsError);
              throw detailsError;
            }
            
            console.log(`[databaseService] Successfully created ${details?.length || 0} section details`);
          } else {
            console.warn("[databaseService] No section details to insert");
          }
        } else {
          console.warn("[databaseService] No sections were created");
        }
      } catch (sectionError) {
        console.error("[databaseService] Error processing sections:", sectionError);
        // We'll continue without sections if there was an error
        // but log the issue for debugging
      }
    } else {
      console.warn("[databaseService] No sections data available in analysis");
    }
    
    console.log("[databaseService] Completed saving all analysis results");
    
    return company.id;
  } catch (error) {
    console.error("[databaseService] Error in saveAnalysisResults:", error);
    
    if (error instanceof Error && error.stack) {
      console.error("[databaseService] Stack trace:", error.stack);
    }
    
    // Update the report to mark analysis as failed
    try {
      await supabase
        .from('reports')
        .update({ 
          analysis_status: 'failed',
          analysis_error: error instanceof Error ? error.message : 'Unknown error during save'
        })
        .eq('id', report.id);
    } catch (updateError) {
      console.error("[databaseService] Failed to update report status:", updateError);
    }
    
    throw error;
  }
}
