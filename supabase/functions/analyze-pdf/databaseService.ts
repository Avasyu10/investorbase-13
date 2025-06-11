
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';
import { AnalysisResult } from './openaiService.ts';

export async function saveAnalysisResults(supabase: any, analysis: AnalysisResult, report: any): Promise<string> {
  console.log("Saving analysis results to database");
  console.log("Analysis overview:", {
    overallScore: analysis.overallScore,
    sectionsCount: analysis.sections?.length || 0,
    assessmentPointsCount: analysis.assessmentPoints?.length || 0
  });

  try {
    // Create the company record first
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: report.title || 'Untitled Company',
        description: report.description || '',
        overall_score: analysis.overallScore || 2.5,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    console.log("Company created successfully:", company.id);

    // Process and save each section
    if (analysis.sections && analysis.sections.length > 0) {
      console.log("Processing sections:", analysis.sections.length);
      
      const sectionsToInsert = analysis.sections.map((section, index) => ({
        company_id: company.id,
        title: section.title || `Section ${index + 1}`,
        type: section.type || 'UNKNOWN',
        score: Math.min(Math.max(section.score || 2.5, 0.5), 5), // Ensure score is between 0.5 and 5
        strengths: section.strengths || [],
        weaknesses: section.weaknesses || [],
        detailed_content: section.detailedContent || 'No detailed content available.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      console.log("Inserting sections:", sectionsToInsert.length);
      
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsToInsert)
        .select();

      if (sectionsError) {
        console.error("Error creating sections:", sectionsError);
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log("Sections created successfully:", sections?.length || 0);
    } else {
      console.log("No sections to process");
    }

    // Update the report status
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id);

    if (reportUpdateError) {
      console.error("Error updating report status:", reportUpdateError);
      // Don't throw here, as the main analysis is complete
    } else {
      console.log("Report status updated to completed");
    }

    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    
    // Update report with error status
    try {
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id);
    } catch (updateError) {
      console.error("Error updating report error status:", updateError);
    }
    
    throw error;
  }
}
