
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCompanyDetails(companyId: string) {
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      try {
        if (!companyId) {
          throw new Error('Company ID is required');
        }

        // Get company details from Supabase
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select(`
            *,
            details:company_details(*),
            sections:sections(*),
            report:reports(*, email_pitch_submissions(*))
          `)
          .eq('id', companyId)
          .single();

        if (companyError) {
          console.error('Error fetching company:', companyError);
          throw companyError;
        }

        if (!companyData) {
          throw new Error('Company not found');
        }

        // Get section details (strengths and weaknesses)
        const { data: sectionDetails, error: sectionError } = await supabase
          .from('section_details')
          .select('*')
          .in(
            'section_id',
            companyData.sections.map((section: any) => section.id)
          );

        if (sectionError) {
          console.error('Error fetching section details:', sectionError);
        }

        // Organize section details by section ID
        const detailsBySection = (sectionDetails || []).reduce((acc: any, detail: any) => {
          if (!acc[detail.section_id]) {
            acc[detail.section_id] = {
              strengths: [],
              weaknesses: [],
            };
          }

          if (detail.detail_type === 'strength') {
            acc[detail.section_id].strengths.push(detail.content);
          } else if (detail.detail_type === 'weakness') {
            acc[detail.section_id].weaknesses.push(detail.content);
          }

          return acc;
        }, {});

        // Format sections with details
        const formattedSections = companyData.sections.map((section: any) => {
          const details = detailsBySection[section.id] || { strengths: [], weaknesses: [] };
          return {
            id: section.id,
            type: section.type,
            title: section.title,
            score: section.score,
            description: section.description || '',
            strengths: details.strengths,
            weaknesses: details.weaknesses,
          };
        });

        // Check for founder LinkedIn profiles from public form submissions
        let founderLinkedIns: string[] = [];
        let submitterEmail: string | null = null;

        if (companyData.report) {
          // Try to find public form submission
          const { data: submissionData } = await supabase
            .from('public_form_submissions')
            .select('founder_linkedin_profiles')
            .eq('report_id', companyData.report.id)
            .maybeSingle();

          if (submissionData && submissionData.founder_linkedin_profiles) {
            founderLinkedIns = submissionData.founder_linkedin_profiles;
          }

          // Get submitter email information
          submitterEmail = companyData.report.submitter_email || null;

          // Check if it's from an email pitch submission
          if (companyData.report.email_pitch_submissions && companyData.report.email_pitch_submissions.length > 0) {
            const emailPitch = companyData.report.email_pitch_submissions[0];
            submitterEmail = emailPitch.sender_email || submitterEmail;
          }
        }

        // Format the final company object
        return {
          id: companyData.id,
          name: companyData.name,
          overallScore: companyData.overall_score || 0,
          createdAt: companyData.created_at,
          updatedAt: companyData.updated_at,
          reportId: companyData.report_id,
          details: companyData.details || null,
          sections: formattedSections,
          founderLinkedIns,
          submitterEmail,
        };
      } catch (err) {
        console.error('Error in useCompanyDetails:', err);
        throw err;
      }
    },
    enabled: !!companyId,
  });

  return {
    company,
    isLoading,
    error,
  };
}
