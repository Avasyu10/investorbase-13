
import { AnalysisResult } from "./openaiService.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function saveAnalysisResults(
  supabase: SupabaseClient,
  analysis: AnalysisResult,
  report: any
): Promise<string> {
  console.log("Saving analysis results to database");
  
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
    
    console.log("Creating company record with data:", {
      ...companyData,
      assessment_points: `${companyData.assessment_points.length} items`,
    });
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();
    
    if (companyError) {
      console.error("Error creating company:", companyError);
      throw companyError;
    }
    
    if (!company) {
      throw new Error("Failed to create company record");
    }
    
    console.log(`Created company: ${company.id}, name: ${company.name}`);
    
    // Update the report to link it to the company
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({ 
        company_id: company.id,
        analysis_status: 'completed'
      })
      .eq('id', report.id);
    
    if (reportUpdateError) {
      console.error("Error updating report:", reportUpdateError);
      throw reportUpdateError;
    }
    
    // Create sections for each category in the analysis
    // We'll use the service role to bypass RLS policies
    const adminApiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const apiUrl = Deno.env.get('SUPABASE_URL') || '';
    
    if (!adminApiKey || !apiUrl) {
      console.error("Missing admin credentials for section creation");
      throw new Error("Missing admin credentials");
    }
    
    // Create a new client with the service role key to bypass RLS
    const adminSupabase = new SupabaseClient(apiUrl, adminApiKey);
    
    const sectionPromises = Object.entries(analysis.sections).map(
      async ([sectionType, sectionData]) => {
        if (!sectionData) return null;
        
        // Ensure we have a proper section type and description
        const normalizedSectionType = sectionType.toUpperCase();
        const description = sectionData.detailedContent || sectionData.summary || "No detailed content available";
        
        console.log(`Creating section for ${sectionType} with score ${sectionData.score} and description length ${description.length}`);
        
        const { data: section, error: sectionError } = await adminSupabase
          .from('sections')
          .insert([{
            company_id: company.id,
            title: sectionData.title || sectionType.charAt(0).toUpperCase() + sectionType.slice(1),
            type: sectionType,
            score: sectionData.score || 0,
            description: description,
            section_type: normalizedSectionType // Add the section_type explicitly
          }])
          .select()
          .single();
        
        if (sectionError) {
          console.error(`Error creating section ${sectionType}:`, sectionError);
          return null;
        }
        
        if (!section) {
          console.warn(`Failed to create section ${sectionType}`);
          return null;
        }
        
        console.log(`Created section: ${section.id}, type: ${section.type}, section_type: ${section.section_type}`);
        
        // Create section details (strengths and weaknesses)
        const detailPromises = [];
        
        if (sectionData.strengths && sectionData.strengths.length > 0) {
          for (const strength of sectionData.strengths) {
            detailPromises.push(
              adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength,
                }])
            );
          }
        }
        
        if (sectionData.weaknesses && sectionData.weaknesses.length > 0) {
          for (const weakness of sectionData.weaknesses) {
            detailPromises.push(
              adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: weakness,
                }])
            );
          }
        }
        
        if (detailPromises.length > 0) {
          try {
            await Promise.all(detailPromises);
            console.log(`Added ${detailPromises.length} details for section ${sectionType}`);
          } catch (detailError) {
            console.error(`Error adding details for section ${sectionType}:`, detailError);
          }
        }
        
        return section;
      }
    );
    
    await Promise.all(sectionPromises);
    console.log("Completed saving all analysis results");
    
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    
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
      console.error("Failed to update report status:", updateError);
    }
    
    throw error;
  }
}
