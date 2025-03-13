
export async function saveAnalysisResults(supabase: any, analysis: any, report: any) {
  try {
    console.log("Creating company record");
    // Create a company entry for the report
    const companyName = report.title;
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        total_score: Math.round(analysis.overallScore * 20) // Convert 0-5 scale to 0-100
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error('Failed to create company record');
    }

    console.log(`Company created with ID: ${company.id}, inserting sections`);

    // Insert sections
    const sectionInserts = analysis.sections.map((section: any) => ({
      company_id: company.id,
      name: section.title,
      description: section.description,
      score: Math.round(section.score * 20), // Convert 0-5 scale to 0-100
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionInserts);

    if (sectionsError) {
      console.error("Error creating sections:", sectionsError);
      throw new Error('Failed to create section records');
    }

    console.log("Sections inserted, getting IDs for detail records");

    // Get all inserted sections to get their IDs
    const { data: insertedSections, error: getSectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('company_id', company.id);

    if (getSectionsError) {
      console.error("Error getting sections:", getSectionsError);
      throw new Error('Failed to retrieve section records');
    }

    console.log(`Retrieved ${insertedSections.length} sections, creating detail records`);

    // Insert section details (strengths and weaknesses)
    const sectionDetails = [];
    for (let i = 0; i < insertedSections.length; i++) {
      const section = insertedSections[i];
      const analysisSection = analysis.sections[i];

      if (analysisSection.strengths) {
        analysisSection.strengths.forEach((strength: string) => {
          sectionDetails.push({
            section_id: section.id,
            title: "Strength",
            content: strength,
            score_impact: "positive"
          });
        });
      }

      if (analysisSection.weaknesses) {
        analysisSection.weaknesses.forEach((weakness: string) => {
          sectionDetails.push({
            section_id: section.id,
            title: "Weakness",
            content: weakness,
            score_impact: "negative"
          });
        });
      }
    }

    if (sectionDetails.length > 0) {
      console.log(`Inserting ${sectionDetails.length} detail records`);
      const { error: detailsError } = await supabase
        .from('section_details')
        .insert(sectionDetails);

      if (detailsError) {
        console.error("Error creating section details:", detailsError);
        throw new Error('Failed to create section detail records');
      }
    }

    console.log("Section details inserted, updating report");

    // Update report with analysis results
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        sections: analysis.sections.map((s: any) => s.title)
      })
      .eq('id', report.id);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw new Error('Failed to update report');
    }

    console.log("Analysis process complete!");
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    throw error;
  }
}
