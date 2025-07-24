
import { AnalysisResult } from "./openaiService.ts";

export async function saveAnalysisResults(supabase: any, analysis: AnalysisResult, report: any) {
  console.log("Saving VC analysis results to database");
  
  try {
    // Extract contact information from analysis
    const contactInfo = analysis.companyInfo?.contactInfo || {};
    const companyInfo = analysis.companyInfo || {};
    
    // Create the deck URL from storage path
    const deckUrl = `https://jhtnruktmtjqrfoiyrep.supabase.co/storage/v1/object/public/Report%20PDFs/${report.user_id}/${report.pdf_url}`;
    
    // Create company record with extracted contact information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: companyInfo.name || report.title,
        overall_score: analysis.overallScore || 0,
        assessment_points: analysis.assessmentPoints || [],
        report_id: report.id,
        user_id: report.user_id,
        source: 'vc_analysis',
        deck_url: deckUrl,
        // Contact information fields
        phonenumber: contactInfo.phoneNumber || null,
        email: contactInfo.email || null,
        poc_name: contactInfo.pocName || null,
        industry: contactInfo.extractedIndustry || companyInfo.industry || null
      }])
      .select()
      .single();
    
    if (companyError) {
      console.error("Error creating company:", companyError);
      throw companyError;
    }
    
    console.log("Company created:", company.id);
    
    // Update the report with company_id and analysis results
    const { error: updateError } = await supabase
      .from('reports')
      .update({ 
        company_id: company.id,
        analysis_status: 'completed',
        analysis_result: analysis,
        analyzed_at: new Date().toISOString(),
        overall_score: analysis.overallScore
      })
      .eq('id', report.id);
    
    if (updateError) {
      console.error("Error updating report:", updateError);
      throw updateError;
    }
    
    // Save sections if they exist
    if (analysis.sections && analysis.sections.length > 0) {
      console.log("Saving sections:", analysis.sections.length);
      
      for (const section of analysis.sections) {
        // Insert section
        const { data: savedSection, error: sectionError } = await supabase
          .from('sections')
          .insert([{
            company_id: company.id,
            title: section.title,
            type: section.type,
            score: section.score || 0,
            description: section.description || ''
          }])
          .select()
          .single();
        
        if (sectionError) {
          console.error("Error saving section:", sectionError);
          continue; // Continue with other sections
        }
        
        // Save section details (strengths and weaknesses)
        const details = [];
        
        if (section.strengths && Array.isArray(section.strengths)) {
          for (const strength of section.strengths) {
            details.push({
              section_id: savedSection.id,
              detail_type: 'strength',
              content: strength
            });
          }
        }
        
        if (section.weaknesses && Array.isArray(section.weaknesses)) {
          for (const weakness of section.weaknesses) {
            details.push({
              section_id: savedSection.id,
              detail_type: 'weakness',
              content: weakness
            });
          }
        }
        
        if (details.length > 0) {
          const { error: detailsError } = await supabase
            .from('section_details')
            .insert(details);
          
          if (detailsError) {
            console.error("Error saving section details:", detailsError);
          }
        }
      }
    }
    
    console.log("VC Analysis results saved successfully");
    return company.id;
  } catch (error) {
    console.error("Error saving VC analysis results:", error);
    throw error;
  }
}
