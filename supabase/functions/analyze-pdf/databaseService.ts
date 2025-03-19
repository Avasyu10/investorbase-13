
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function saveAnalysisResults(supabase, analysis, report) {
  try {
    console.log("Saving analysis results to database");
    
    if (!analysis || !analysis.sections || !analysis.overallScore) {
      console.error("Invalid analysis data:", analysis);
      throw new Error("Analysis data is incomplete or invalid");
    }
    
    // Extract and verify the normalized overall score
    let normalizedScore = analysis.overallScore;
    
    // If for some reason the score wasn't normalized in the API response, do it here
    const sectionsWithScores = analysis.sections.filter(section => typeof section.score === 'number');
    if (sectionsWithScores.length > 0) {
      const totalSectionScore = sectionsWithScores.reduce((sum, section) => sum + section.score, 0);
      const averageScore = totalSectionScore / sectionsWithScores.length; // Use the count of sections with scores
      
      // Check if the provided score matches the expected normalized score
      const expectedNormalizedScore = Math.min(averageScore * 1.25, 5.0);
      const formattedExpectedScore = parseFloat(expectedNormalizedScore.toFixed(1));
      
      // If there's a significant difference, log it and use our calculated normalized score
      if (Math.abs(normalizedScore - formattedExpectedScore) > 0.05) {
        console.warn(`Score normalization issue detected: API=${normalizedScore}, Calculated=${formattedExpectedScore}`);
        console.warn(`Average section score: ${averageScore.toFixed(2)}`);
        console.warn(`Using calculated normalized score: ${formattedExpectedScore}`);
        normalizedScore = formattedExpectedScore;
      }
    }
    
    console.log(`Final normalized overall score: ${normalizedScore}`);
    
    // Create the company record with the normalized score
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: report.title,
        user_id: report.user_id,
        overall_score: normalizedScore,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id
      })
      .select('id')
      .single();
    
    if (companyError) {
      console.error("Error creating company record:", companyError);
      throw companyError;
    }
    
    const companyId = company.id;
    console.log(`Created company record: ${companyId}`);
    
    // Process and insert all sections
    const sectionPromises = analysis.sections.map(async (section) => {
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .insert({
          company_id: companyId,
          type: section.type,
          title: section.title,
          score: section.score,
          description: section.description || ''
        })
        .select('id')
        .single();
      
      if (sectionError) {
        console.error(`Error creating section record for ${section.type}:`, sectionError);
        throw sectionError;
      }
      
      const sectionId = sectionData.id;
      console.log(`Created section record: ${sectionId} for ${section.type}`);
      
      // Insert strengths and weaknesses for this section
      if (section.strengths && Array.isArray(section.strengths) && section.strengths.length > 0) {
        const strengthPromises = section.strengths.map(async (strength) => {
          return supabase
            .from('section_details')
            .insert({
              section_id: sectionId,
              detail_type: 'strength',
              content: strength
            });
        });
        
        await Promise.all(strengthPromises);
        console.log(`Added ${section.strengths.length} strengths for section ${sectionId}`);
      }
      
      if (section.weaknesses && Array.isArray(section.weaknesses) && section.weaknesses.length > 0) {
        const weaknessPromises = section.weaknesses.map(async (weakness) => {
          return supabase
            .from('section_details')
            .insert({
              section_id: sectionId,
              detail_type: 'weakness',
              content: weakness
            });
        });
        
        await Promise.all(weaknessPromises);
        console.log(`Added ${section.weaknesses.length} weaknesses for section ${sectionId}`);
      }
      
      return sectionId;
    });
    
    // Wait for all section processing to complete
    await Promise.all(sectionPromises);
    console.log("All sections processed successfully");
    
    // Update the report with the company ID and set status to complete
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({ 
        company_id: companyId,
        analysis_status: 'complete'
      })
      .eq('id', report.id);
    
    if (reportUpdateError) {
      console.error("Error updating report with company ID:", reportUpdateError);
      throw reportUpdateError;
    }
    
    console.log(`Updated report ${report.id} with company ID ${companyId}`);
    
    return companyId;
    
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    throw error;
  }
}
