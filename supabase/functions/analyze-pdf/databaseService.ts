
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function saveAnalysisResults(
  supabase: any,
  analysis: any,
  report: any
): Promise<string> {
  console.log("Saving analysis results to database");
  
  try {
    // First, check and update analysis limits with a timeout
    const limitsPromise = new Promise(async (resolve, reject) => {
      try {
        const { data: limitsData, error: limitsError } = await supabase
          .from('analysis_limits')
          .select('analysis_count, max_analysis_allowed')
          .eq('user_id', report.user_id)
          .single();
        
        if (limitsError) {
          console.error("Error checking analysis limits:", limitsError);
          reject(limitsError);
          return;
        }
        
        if (!limitsData) {
          reject(new Error("No analysis limits found for user"));
          return;
        }
        
        if (limitsData.analysis_count >= limitsData.max_analysis_allowed) {
          reject(new Error("Analysis limit reached"));
          return;
        }
        
        // Increment the analysis count
        const { error: updateError } = await supabase
          .from('analysis_limits')
          .update({ analysis_count: limitsData.analysis_count + 1 })
          .eq('user_id', report.user_id);
          
        if (updateError) {
          console.error("Error updating analysis count:", updateError);
          reject(updateError);
          return;
        }
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
    
    // Set a timeout for the limits check
    const limitsTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout checking analysis limits")), 20000)
    );
    
    await Promise.race([limitsPromise, limitsTimeout]);
    
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
      // Add the prompt and response data
      prompt_sent: analysis.promptSent || null,
      response_received: analysis.responseReceived || null
    };
    
    console.log("Creating company record with data:", {
      ...companyData,
      assessment_points: `${companyData.assessment_points.length} items`,
      prompt_sent: companyData.prompt_sent ? "Set" : "Not set",
      response_received: companyData.response_received ? "Set" : "Not set"
    });
    
    // Set a timeout for company creation
    const companyPromise = new Promise(async (resolve, reject) => {
      try {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert([companyData])
          .select()
          .single();
        
        if (companyError) {
          console.error("Error creating company:", companyError);
          reject(companyError);
          return;
        }
        
        if (!company) {
          reject(new Error("Failed to create company record"));
          return;
        }
        
        console.log(`Created company: ${company.id}, name: ${company.name}`);
        resolve(company);
      } catch (error) {
        reject(error);
      }
    });
    
    const companyTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout creating company")), 20000)
    );
    
    const company = await Promise.race([companyPromise, companyTimeout]);
    
    // Update the report to link it to the company
    const reportUpdatePromise = new Promise(async (resolve, reject) => {
      try {
        const { error: reportUpdateError } = await supabase
          .from('reports')
          .update({ 
            company_id: company.id,
            analysis_status: 'completed'
          })
          .eq('id', report.id);
        
        if (reportUpdateError) {
          console.error("Error updating report:", reportUpdateError);
          reject(reportUpdateError);
          return;
        }
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
    
    const reportUpdateTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout updating report")), 10000)
    );
    
    await Promise.race([reportUpdatePromise, reportUpdateTimeout]);
    
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
    
    // Process sections in parallel but with limited concurrency to avoid timeouts
    const processBatch = async (batch: any[]) => {
      return Promise.all(batch.map(async (sectionData) => {
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
        
        try {
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
          if (sectionData.strengths && sectionData.strengths.length > 0) {
            for (const strength of sectionData.strengths) {
              await adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'strength',
                  content: strength,
                }]);
            }
          }
          
          if (sectionData.weaknesses && sectionData.weaknesses.length > 0) {
            for (const weakness of sectionData.weaknesses) {
              await adminSupabase
                .from('section_details')
                .insert([{
                  section_id: section.id,
                  detail_type: 'weakness',
                  content: weakness,
                }]);
            }
          }
          
          console.log(`Added ${(sectionData.strengths?.length || 0) + (sectionData.weaknesses?.length || 0)} details for section ${sectionData.type}`);
          
          return section;
        } catch (sectionError) {
          console.error(`Error processing section ${sectionData.type}:`, sectionError);
          return null;
        }
      }));
    };
    
    // Process sections in smaller batches to avoid timeouts
    const BATCH_SIZE = 3;
    const sections = analysis.sections || [];
    
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
    }
    
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
