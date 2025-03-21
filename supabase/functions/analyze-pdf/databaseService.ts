
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function saveAnalysisResults(
  supabase: any,
  analysis: any,
  report: any
): Promise<string> {
  console.log("Saving analysis results to database");
  
  try {
    // Extract company information from analysis
    const companyInfo = extractCompanyInfo(analysis);
    
    // First, create the company record
    const companyData = {
      name: analysis.companyName || report.title,
      overall_score: analysis.overallScore || 0,
      assessment_points: analysis.assessmentPoints || [],
      report_id: report.id,
      // Determine the source based on if it's a public submission
      source: report.is_public_submission ? 'public_url' : 'dashboard',
      // Important: Use the report's user_id which should be the form owner's ID
      user_id: report.user_id,
      // Add extracted company information
      website: companyInfo.website,
      industry: companyInfo.industry,
      stage: companyInfo.stage,
      introduction: companyInfo.introduction
    };
    
    console.log("Creating company record with data:", {
      ...companyData,
      assessment_points: `${companyData.assessment_points.length} items`,
    });
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([companyData])
      .select()
      .single();
    
    if (companyError) {
      console.error("Error creating company:", companyError);
      throw companyError;
    }
    
    if (!company) {
      throw new Error("Failed to create company record");
    }
    
    console.log(`Created company: ${company.id}, name: ${company.name}`);
    
    // Update the report to link it to the company
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({ 
        company_id: company.id,
        analysis_status: 'completed'
      })
      .eq('id', report.id);
    
    if (reportUpdateError) {
      console.error("Error updating report:", reportUpdateError);
      throw reportUpdateError;
    }
    
    // Create sections for each category in the analysis
    // We'll use the service role to bypass RLS policies
    const adminApiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const apiUrl = Deno.env.get('SUPABASE_URL') || '';
    
    if (!adminApiKey || !apiUrl) {
      console.error("Missing admin credentials for section creation");
      throw new Error("Missing admin credentials");
    }
    
    // Create a new client with the service role key to bypass RLS
    const adminSupabase = createClient(apiUrl, adminApiKey);
    
    const sectionPromises = analysis.sections.map(
      async (sectionData) => {
        if (!sectionData) return null;
        
        // Ensure we have a proper section type and description
        const normalizedSectionType = sectionData.type.toUpperCase();
        
        // Make sure we have a description - prioritize detailedContent then description
        let detailedDescription = "";
        if (sectionData.detailedContent && sectionData.detailedContent.trim().length > 0) {
          detailedDescription = sectionData.detailedContent;
        } else if (sectionData.description && sectionData.description.trim().length > 0) {
          detailedDescription = sectionData.description;
        } else {
          // Fallback to summary if available or a default message
          detailedDescription = sectionData.summary || "No detailed content available.";
        }
        
        // Also prepare the description specifically (shorter version)
        const description = sectionData.description || detailedDescription;
        
        console.log(`Creating section for ${sectionData.type} with score ${sectionData.score} and description length ${description.length}`);
        
        const { data: section, error: sectionError } = await adminSupabase
          .from('sections')
          .insert([{
            company_id: company.id,
            title: sectionData.title || sectionData.type.charAt(0).toUpperCase() + sectionData.type.slice(1).toLowerCase().replace(/_/g, ' '),
            type: sectionData.type,
            score: sectionData.score || 0,
            description: detailedDescription, // Use the detailed description here
            section_type: normalizedSectionType // Add the section_type explicitly
          }])
          .select()
          .single();
        
        if (sectionError) {
          console.error(`Error creating section ${sectionData.type}:`, sectionError);
          return null;
        }
        
        if (!section) {
          console.warn(`Failed to create section ${sectionData.type}`);
          return null;
        }
        
        console.log(`Created section: ${section.id}, type: ${section.type}, section_type: ${section.section_type}`);
        
        // Create section details (strengths and weaknesses)
        const detailPromises = [];
        
        if (sectionData.strengths && sectionData.strengths.length > 0) {
          for (const strength of sectionData.strengths) {
            detailPromises.push(
              adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength,
                }])
            );
          }
        }
        
        if (sectionData.weaknesses && sectionData.weaknesses.length > 0) {
          for (const weakness of sectionData.weaknesses) {
            detailPromises.push(
              adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: weakness,
                }])
            );
          }
        }
        
        if (detailPromises.length > 0) {
          try {
            await Promise.all(detailPromises);
            console.log(`Added ${detailPromises.length} details for section ${sectionData.type}`);
          } catch (detailError) {
            console.error(`Error adding details for section ${sectionData.type}:`, detailError);
          }
        }
        
        return section;
      }
    );
    
    await Promise.all(sectionPromises);
    console.log("Completed saving all analysis results");
    
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    
    // Update the report to mark analysis as failed
    try {
      await supabase
        .from('reports')
        .update({ 
          analysis_status: 'failed',
          analysis_error: error instanceof Error ? error.message : 'Unknown error during save'
        })
        .eq('id', report.id);
    } catch (updateError) {
      console.error("Failed to update report status:", updateError);
    }
    
    throw error;
  }
}

// Helper function to extract company information from the analysis
function extractCompanyInfo(analysis: any) {
  console.log("Extracting company information from analysis");
  
  const info = {
    website: "",
    industry: "",
    stage: "",
    introduction: ""
  };
  
  // Try to extract from company overview section
  const overviewSection = analysis.sections?.find(
    (s) => s.type?.toLowerCase().includes('company') || 
           s.title?.toLowerCase().includes('company') ||
           s.type?.toLowerCase().includes('introduction') ||
           s.title?.toLowerCase().includes('introduction')
  );
  
  if (overviewSection) {
    info.introduction = overviewSection.detailedContent || overviewSection.description || "";
    console.log("Found introduction from overview section");
  }
  
  // Try to extract from market section for industry
  const marketSection = analysis.sections?.find(
    (s) => s.type?.toLowerCase().includes('market') ||
           s.title?.toLowerCase().includes('market')
  );
  
  if (marketSection) {
    const content = marketSection.detailedContent || marketSection.description || "";
    
    // Try to find industry mentions
    const industryMatches = content.match(/industry:?\s*([^\.]+)/i) || 
                          content.match(/in the ([^\s,\.]+(?:\s+[^\s,\.]+){0,4}) (?:industry|market|sector)/i);
    
    if (industryMatches && industryMatches[1]) {
      info.industry = industryMatches[1].trim();
      console.log("Extracted industry:", info.industry);
    }
  }
  
  // Look for website mentions across all sections
  for (const section of analysis.sections || []) {
    const content = section.detailedContent || section.description || "";
    
    // Website patterns
    const websitePatterns = [
      /website:?\s*(https?:\/\/[^\s,\.]+(?:\.[^\s,\.]+)+)/i,
      /visit us at:?\s*(https?:\/\/[^\s,\.]+(?:\.[^\s,\.]+)+)/i,
      /(https?:\/\/[^\s,\.]+(?:\.[^\s,\.]+)+)/i,
      /www\.[^\s,\.]+\.[^\s,\.]+/i
    ];
    
    for (const pattern of websitePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        info.website = match[1].trim();
        console.log("Extracted website:", info.website);
        break;
      }
    }
    
    // Stage patterns
    const stagePatterns = [
      /stage:?\s*([^\.]+)/i,
      /(?:we are|company is) (?:at|in) (?:the)?\s*([^\s,\.]+(?:\s+[^\s,\.]+){0,2}) stage/i,
      /(?:seed|early|growth|series [A-Z]|pre-seed|late) stage/i
    ];
    
    for (const pattern of stagePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.stage = match[0].includes("stage:") && match[1] ? match[1].trim() : match[0].trim();
        console.log("Extracted stage:", info.stage);
        break;
      }
    }
    
    // If we found both, no need to search further
    if (info.website && info.industry && info.stage) {
      break;
    }
  }
  
  // If we couldn't find a proper introduction, create one from the company name and description
  if (!info.introduction && analysis.companyDescription) {
    info.introduction = analysis.companyDescription;
    console.log("Using company description as introduction");
  }
  
  console.log("Final extracted company info:", info);
  return info;
}
