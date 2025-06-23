
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export class DatabaseService {
  constructor(private supabase: any) {}

  async createCompany(userId: string, overallScore: number, assessmentPoints: string[], companyName: string, companyEmail?: string) {
    console.log('Creating company with score:', overallScore);
    
    const { data: company, error } = await this.supabase
      .from('companies')
      .insert({
        user_id: userId,
        name: companyName || 'Unknown Company',
        email: companyEmail,
        overall_score: overallScore,
        assessment_points: assessmentPoints || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      throw error;
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
    const sectionsToCreate = sections.map(section => ({
      company_id: companyId,
      title: section.title || 'Untitled Section',
      type: section.type || 'GENERAL',
      section_type: section.type || 'GENERAL',
      score: section.score || 0,
      description: section.description || section.detailedContent || ''
    }));

    const { data: createdSections, error: sectionsError } = await this.supabase
      .from('sections')
      .insert(sectionsToCreate)
      .select();

    if (sectionsError) {
      console.error('Error creating sections:', sectionsError);
      throw sectionsError;
    }

    console.log('Sections created successfully:', createdSections.length);

    // Create section details for each section
    for (let i = 0; i < createdSections.length; i++) {
      const section = sections[i];
      const createdSection = createdSections[i];
      
      if (section.strengths && section.strengths.length > 0) {
        const strengthDetails = section.strengths.map((strength: string) => ({
          section_id: createdSection.id,
          detail_type: 'strength',
          content: strength
        }));

        await this.supabase
          .from('section_details')
          .insert(strengthDetails);
      }

      if (section.weaknesses && section.weaknesses.length > 0) {
        const weaknessDetails = section.weaknesses.map((weakness: string) => ({
          section_id: createdSection.id,
          detail_type: 'weakness',
          content: weakness
        }));

        await this.supabase
          .from('section_details')
          .insert(weaknessDetails);
      }
    }

    return createdSections;
  }
}
