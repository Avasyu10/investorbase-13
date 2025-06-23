
export class DatabaseService {
  constructor(private supabase: any) {}

  async createCompany(userId: string, overallScore: number, assessmentPoints: string[], companyName?: string, companyEmail?: string) {
    console.log('Creating company record');
    
    const { data: company, error: companyError } = await this.supabase
      .from('companies')
      .insert({
        name: companyName || 'Untitled Company',
        email: companyEmail,
        overall_score: overallScore,
        assessment_points: assessmentPoints,
        user_id: userId,
        source: 'dashboard'
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    console.log('Company created successfully:', company.id);
    return company.id;
  }

  async createSections(companyId: string, sections: any[]) {
    if (!sections || sections.length === 0) {
      console.log('No sections to create');
      return [];
    }

    console.log('Creating sections for company:', companyId);
    const createdSections = [];

    for (const section of sections) {
      // Create the section
      const { data: sectionData, error: sectionError } = await this.supabase
        .from('sections')
        .insert({
          company_id: companyId,
          title: section.title,
          type: section.type,
          score: section.score || 0,
          description: section.description || ''
        })
        .select()
        .single();

      if (sectionError) {
        console.error('Error creating section:', sectionError);
        throw new Error(`Failed to create section: ${sectionError.message}`);
      }

      // Create section details (strengths and weaknesses)
      const detailsToInsert = [];
      
      if (section.strengths && Array.isArray(section.strengths)) {
        for (const strength of section.strengths) {
          detailsToInsert.push({
            section_id: sectionData.id,
            detail_type: 'strength',
            content: strength
          });
        }
      }
      
      if (section.weaknesses && Array.isArray(section.weaknesses)) {
        for (const weakness of section.weaknesses) {
          detailsToInsert.push({
            section_id: sectionData.id,
            detail_type: 'weakness',
            content: weakness
          });
        }
      }
      
      if (detailsToInsert.length > 0) {
        const { error: detailsError } = await this.supabase
          .from('section_details')
          .insert(detailsToInsert);
        
        if (detailsError) {
          console.error('Error creating section details:', detailsError);
          throw new Error(`Failed to create section details: ${detailsError.message}`);
        }
      }

      createdSections.push(sectionData);
    }

    console.log('Sections created successfully:', createdSections.length);
    return createdSections;
  }
}
