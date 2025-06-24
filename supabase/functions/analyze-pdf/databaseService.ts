
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export async function saveAnalysisResults(supabase: any, analysis: any, report: any) {
  console.log("Starting to save analysis results to database");
  
  try {
    // Create company entry
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: report.title || 'Unknown Company',
        overall_score: analysis.overallScore || 0,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id,
        user_id: report.user_id,
        source: report.is_public_submission ? 'public_submission' : 'dashboard'
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw companyError;
    }

    console.log("Company created successfully:", company.id);

    // Save sections
    if (analysis.sections && analysis.sections.length > 0) {
      const sectionsToInsert = analysis.sections.map((section: any) => ({
        company_id: company.id,
        title: section.title,
        type: section.type,
        score: section.score || 0,
        description: section.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToInsert)
        .select();

      if (sectionsError) {
        console.error("Error creating sections:", sectionsError);
        throw sectionsError;
      }

      console.log("Sections created successfully:", sections.length);

      // Save section details (strengths, weaknesses, and detailed content)
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const analysisSection = analysis.sections[i];
        
        const detailsToInsert = [];

        // Add strengths
        if (analysisSection.strengths && analysisSection.strengths.length > 0) {
          analysisSection.strengths.forEach((strength: string) => {
            detailsToInsert.push({
              section_id: section.id,
              detail_type: 'strength',
              content: strength
            });
          });
        }

        // Add weaknesses
        if (analysisSection.weaknesses && analysisSection.weaknesses.length > 0) {
          analysisSection.weaknesses.forEach((weakness: string) => {
            detailsToInsert.push({
              section_id: section.id,
              detail_type: 'weakness',
              content: weakness
            });
          });
        }

        // Add detailed content if available
        if (analysisSection.detailedContent) {
          detailsToInsert.push({
            section_id: section.id,
            detail_type: 'detailed_content',
            content: analysisSection.detailedContent
          });
        }

        if (detailsToInsert.length > 0) {
          const { error: detailsError } = await supabase
            .from('section_details')
            .insert(detailsToInsert);

          if (detailsError) {
            console.error("Error creating section details:", detailsError);
            // Don't throw here, continue with other sections
          }
        }
      }
    }

    // Update the report with analysis results and slide notes
    const reportUpdateData: any = {
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      company_id: company.id,
      overall_score: analysis.overallScore
    };

    // Store the full analysis result including slide notes and improvement suggestions if available
    if (analysis.slideBySlideNotes || analysis.improvementSuggestions) {
      reportUpdateData.analysis_result = {
        overallScore: analysis.overallScore,
        assessmentPoints: analysis.assessmentPoints,
        slideBySlideNotes: analysis.slideBySlideNotes || [],
        improvementSuggestions: analysis.improvementSuggestions || [],
        sections: analysis.sections
      };
    }

    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update(reportUpdateData)
      .eq('id', report.id);

    if (reportUpdateError) {
      console.error("Error updating report:", reportUpdateError);
      throw reportUpdateError;
    }

    console.log("Analysis results saved successfully");
    return company.id;

  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    throw error;
  }
}
