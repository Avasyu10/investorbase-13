
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';

export async function saveAnalysisResults(supabase: any, analysis: any, report: any) {
  console.log("Analysis overview:", {
    overallScore: analysis.overallScore,
    sectionsCount: analysis.sections?.length || 0,
    assessmentPointsCount: analysis.assessmentPoints?.length || 0
  });

  try {
    // Get founder contact information and company LinkedIn if this is from a public submission
    let founderEmail = null;
    let founderContact = null;
    let companyLinkedInUrl = null;
    
    if (report.is_public_submission) {
      console.log("This is a public submission, fetching founder contact info and company LinkedIn");
      
      // First try to get from public_form_submissions
      const { data: publicSubmission } = await supabase
        .from('public_form_submissions')
        .select('founder_email, founder_contact, company_linkedin')
        .eq('report_id', report.id)
        .maybeSingle();
      
      if (publicSubmission) {
        founderEmail = publicSubmission.founder_email;
        founderContact = publicSubmission.founder_contact;
        companyLinkedInUrl = publicSubmission.company_linkedin;
        console.log("Found founder contact info and company LinkedIn from public_form_submissions:", { 
          founderEmail, 
          founderContact, 
          companyLinkedInUrl 
        });
      }
      
      // If not found, try barc_form_submissions
      if (!founderEmail && !founderContact) {
        const { data: barcSubmission } = await supabase
          .from('barc_form_submissions')
          .select('submitter_email, phoneno, company_linkedin_url')
          .eq('report_id', report.id)
          .maybeSingle();
        
        if (barcSubmission) {
          founderEmail = barcSubmission.submitter_email;
          founderContact = barcSubmission.phoneno;
          companyLinkedInUrl = barcSubmission.company_linkedin_url;
          console.log("Found founder contact info and company LinkedIn from barc_form_submissions:", { 
            founderEmail, 
            founderContact, 
            companyLinkedInUrl 
          });
        }
      }
    }

    // Create the company record
    const companyData = {
      name: analysis.companyName || report.title || 'Unknown Company',
      overall_score: analysis.overallScore || 0,
      assessment_points: analysis.assessmentPoints || [],
      report_id: report.id,
      user_id: report.user_id,
      source: report.is_public_submission ? 'public_url' : 'dashboard',
      email: founderEmail || null,
      phonenumber: founderContact || null
    };

    console.log("Creating company with data:", companyData);

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    console.log("Company created successfully:", company.id);

    // If we have a company LinkedIn URL, store it in barc_form_submissions for scraping
    if (companyLinkedInUrl && companyLinkedInUrl.trim()) {
      console.log("Storing company LinkedIn URL for future scraping:", companyLinkedInUrl);
      
      // Check if there's already a barc_form_submission for this company
      const { data: existingBarcSubmission } = await supabase
        .from('barc_form_submissions')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (existingBarcSubmission) {
        // Update existing record
        await supabase
          .from('barc_form_submissions')
          .update({ company_linkedin_url: companyLinkedInUrl })
          .eq('company_id', company.id);
        
        console.log("Updated existing barc_form_submission with company LinkedIn URL");
      } else {
        // Create new barc_form_submission record for LinkedIn scraping
        await supabase
          .from('barc_form_submissions')
          .insert({
            form_slug: 'public-submission',
            company_name: company.name,
            company_id: company.id,
            report_id: report.id,
            submitter_email: founderEmail || 'unknown@email.com',
            company_linkedin_url: companyLinkedInUrl,
            analysis_status: 'completed'
          });
        
        console.log("Created new barc_form_submission record with company LinkedIn URL");
      }
    }

    // Save sections if they exist
    if (analysis.sections && Array.isArray(analysis.sections)) {
      console.log("Saving", analysis.sections.length, "sections");
      
      for (const section of analysis.sections) {
        try {
          // Build a comprehensive description from the section content
          let description = '';
          
          // Try to get description from various possible fields
          if (section.description) {
            description = section.description;
          } else if (section.content) {
            description = section.content;
          } else if (section.analysis) {
            description = section.analysis;
          } else if (section.summary) {
            description = section.summary;
          }
          
          // If we have strengths and weaknesses, build description from them
          if (!description && (section.strengths || section.weaknesses)) {
            const parts = [];
            
            if (section.strengths && Array.isArray(section.strengths) && section.strengths.length > 0) {
              parts.push('**Strengths:**\n' + section.strengths.map(s => `• ${s}`).join('\n'));
            }
            
            if (section.weaknesses && Array.isArray(section.weaknesses) && section.weaknesses.length > 0) {
              parts.push('**Areas for Improvement:**\n' + section.weaknesses.map(w => `• ${w}`).join('\n'));
            }
            
            if (parts.length > 0) {
              description = parts.join('\n\n');
            }
          }
          
          // Final fallback
          if (!description) {
            description = `Analysis for ${section.title || 'this section'} will be available shortly.`;
          }

          const sectionData = {
            company_id: company.id,
            title: section.title || 'Untitled Section',
            type: section.type || 'GENERAL',
            score: Number(section.score) || 0,
            description: description
          };

          console.log("Saving section:", sectionData.title, "with description length:", description.length);

          const { data: savedSection, error: sectionError } = await supabase
            .from('sections')
            .insert(sectionData)
            .select()
            .single();

          if (sectionError) {
            console.error("Error saving section:", sectionError);
            continue; // Continue with other sections
          }

          console.log("Section saved successfully:", savedSection.id);

          // Save section details (strengths and weaknesses) separately for additional structure
          if (section.strengths && Array.isArray(section.strengths)) {
            for (const strength of section.strengths) {
              if (strength && strength.trim()) {
                const { error: strengthError } = await supabase
                  .from('section_details')
                  .insert({
                    section_id: savedSection.id,
                    detail_type: 'strength',
                    content: strength.trim()
                  });
                
                if (strengthError) {
                  console.error("Error saving strength:", strengthError);
                }
              }
            }
          }

          if (section.weaknesses && Array.isArray(section.weaknesses)) {
            for (const weakness of section.weaknesses) {
              if (weakness && weakness.trim()) {
                const { error: weaknessError } = await supabase
                  .from('section_details')
                  .insert({
                    section_id: savedSection.id,
                    detail_type: 'weakness',
                    content: weakness.trim()
                  });
                
                if (weaknessError) {
                  console.error("Error saving weakness:", weaknessError);
                }
              }
            }
          }
        } catch (sectionErr) {
          console.error("Error processing section:", section.title, sectionErr);
          // Continue with other sections
        }
      }
    }

    // Update the report status
    await supabase
      .from('reports')
      .update({ 
        analysis_status: 'completed',
        company_id: company.id
      })
      .eq('id', report.id);

    console.log("Analysis results saved successfully");
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    throw error;
  }
}
