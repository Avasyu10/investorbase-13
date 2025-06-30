
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export async function saveAnalysisResults(supabase: any, analysis: any, report: any) {
  console.log("Starting to save analysis results to database");
  
  try {
    // Extract company info from analysis if available
    const companyInfo = analysis.companyInfo || {};
    console.log("Extracted company info:", companyInfo);
    
    // Convert overall score to 5-point scale if it's in 100-point scale
    let overallScore = analysis.overallScore || 0;
    if (overallScore > 5) {
      // Assuming it's in 100-point scale, convert to 5-point scale
      overallScore = (overallScore / 100) * 5;
    }
    
    // Create company entry
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: report.title || 'Unknown Company',
        overall_score: overallScore,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id,
        user_id: report.user_id,
        source: report.is_public_submission ? 'public_submission' : 'dashboard',
        industry: companyInfo.industry || null,
        // Note: stage is stored in company_details table if needed
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw companyError;
    }

    console.log("Company created successfully:", company.id);

    // Save company details if we have extracted company info
    if (companyInfo && Object.keys(companyInfo).length > 0) {
      const { error: companyDetailsError } = await supabase
        .from('company_details')
        .insert({
          company_id: company.id,
          stage: companyInfo.stage || null,
          industry: companyInfo.industry || null,
          website: companyInfo.website || null,
          introduction: companyInfo.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (companyDetailsError) {
        console.error("Error creating company details:", companyDetailsError);
        // Don't throw here, continue with analysis saving
      } else {
        console.log("Company details saved successfully");
      }
    }

    // Save sections
    if (analysis.sections && analysis.sections.length > 0) {
      const sectionsToInsert = analysis.sections.map((section: any) => {
        // Convert section score to 5-point scale if needed
        let sectionScore = section.score || 0;
        if (sectionScore > 5) {
          sectionScore = (sectionScore / 100) * 5;
        }
        
        return {
          company_id: company.id,
          title: section.title,
          type: section.type,
          score: sectionScore,
          description: section.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

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
      overall_score: overallScore
    };

    // Store the full analysis result including slide notes, improvement suggestions, and company info
    if (analysis.slideBySlideNotes || analysis.improvementSuggestions || analysis.companyInfo) {
      reportUpdateData.analysis_result = {
        overallScore: overallScore,
        assessmentPoints: analysis.assessmentPoints,
        slideBySlideNotes: analysis.slideBySlideNotes || [],
        improvementSuggestions: analysis.improvementSuggestions || [],
        companyInfo: analysis.companyInfo || {},
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
