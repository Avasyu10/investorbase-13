
export async function saveAnalysisResults(supabase: any, analysis: any, report: any) {
  try {
    if (!analysis || !analysis.sections || !Array.isArray(analysis.sections)) {
      console.error("Invalid analysis format:", analysis);
      throw new Error('Analysis result is invalid or incomplete');
    }

    if (!report || !report.id) {
      console.error("Invalid report object:", report);
      throw new Error('Report data is invalid');
    }

    console.log("Creating company record");
    // Create a company entry for the report
    const companyName = report.title || 'Unnamed Company';
    let overallScore = 0;
    
    try {
      overallScore = Math.round((analysis.overallScore || 0) * 20); // Convert 0-5 scale to 0-100
    } catch (e) {
      console.warn("Error calculating overall score, using default 0");
    }
    
    console.log(`Inserting company with name: ${companyName}, overall_score: ${overallScore}`);
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        overall_score: overallScore
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error('Failed to create company record: ' + companyError.message);
    }

    if (!company || !company.id) {
      console.error("No company ID returned after insertion");
      throw new Error('Failed to create company record: No ID returned');
    }

    console.log(`Company created with ID: ${company.id}, inserting sections`);

    // Insert sections
    const sectionInserts = analysis.sections.map((section: any) => {
      let sectionScore = 0;
      try {
        sectionScore = Math.round((section.score || 0) * 20); // Convert 0-5 scale to 0-100
      } catch (e) {
        console.warn(`Error calculating score for section ${section.title}, using default 0`);
      }
      
      return {
        company_id: company.id,
        title: section.title || 'Unnamed Section', // Using 'title' instead of 'name'
        description: section.description || '',
        score: sectionScore,
        type: 'analysis' // Adding type field as it's required in the schema
      };
    });

    if (sectionInserts.length === 0) {
      console.warn("No sections to insert");
    } else {
      console.log(`Inserting ${sectionInserts.length} sections`);
      
      const { error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionInserts);

      if (sectionsError) {
        console.error("Error creating sections:", sectionsError);
        throw new Error('Failed to create section records: ' + sectionsError.message);
      }
    }

    console.log("Sections inserted, getting IDs for detail records");

    // Get all inserted sections to get their IDs
    const { data: insertedSections, error: getSectionsError } = await supabase
      .from('sections')
      .select('*')
      .eq('company_id', company.id);

    if (getSectionsError) {
      console.error("Error getting sections:", getSectionsError);
      throw new Error('Failed to retrieve section records: ' + getSectionsError.message);
    }

    if (!insertedSections || insertedSections.length === 0) {
      console.error("No sections found after insertion");
      throw new Error('Failed to retrieve sections after creation');
    }

    console.log(`Retrieved ${insertedSections.length} sections, creating detail records`);

    // Insert section details (strengths and weaknesses)
    const sectionDetails = [];
    for (let i = 0; i < Math.min(insertedSections.length, analysis.sections.length); i++) {
      const section = insertedSections[i];
      const analysisSection = analysis.sections[i];

      if (analysisSection.strengths && Array.isArray(analysisSection.strengths)) {
        analysisSection.strengths.forEach((strength: string) => {
          if (strength && strength.trim()) {
            sectionDetails.push({
              section_id: section.id,
              title: "Strength",
              content: strength,
              detail_type: "strength"
            });
          }
        });
      }

      if (analysisSection.weaknesses && Array.isArray(analysisSection.weaknesses)) {
        analysisSection.weaknesses.forEach((weakness: string) => {
          if (weakness && weakness.trim()) {
            sectionDetails.push({
              section_id: section.id,
              title: "Weakness",
              content: weakness,
              detail_type: "weakness"
            });
          }
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
        throw new Error('Failed to create section detail records: ' + detailsError.message);
      }
    } else {
      console.warn("No section details to insert");
    }

    console.log("Section details inserted, updating report");

    // Update report with analysis results and company ID
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        sections: analysis.sections.map((s: any) => s.title || ''),
        company_id: company.id
      })
      .eq('id', report.id);

    if (updateError) {
      console.error("Error updating report:", updateError);
      throw new Error('Failed to update report: ' + updateError.message);
    }

    console.log("Analysis process complete!");
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    throw error;
  }
}
