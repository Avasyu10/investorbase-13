
// Import Supabase client from ESM URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { SECTION_TYPES, SECTION_TITLES } from "./constants.ts";

// Import SECTION_TYPES and SECTION_TITLES for local use
const EXPECTED_SECTION_TYPES = [
  "PROBLEM", "MARKET", "SOLUTION", "COMPETITIVE_LANDSCAPE", 
  "TRACTION", "BUSINESS_MODEL", "GTM_STRATEGY", 
  "TEAM", "FINANCIALS", "ASK"
];

// Define valid section titles matching the types
const LOCAL_SECTION_TITLES: Record<string, string> = {
  "PROBLEM": "Problem Statement",
  "MARKET": "Market Opportunity",
  "SOLUTION": "Solution (Product)",
  "COMPETITIVE_LANDSCAPE": "Competitive Landscape",
  "TRACTION": "Traction & Milestones",
  "BUSINESS_MODEL": "Business Model",
  "GTM_STRATEGY": "Go-to-Market Strategy",
  "TEAM": "Founder & Team Background",
  "FINANCIALS": "Financial Overview & Projections",
  "ASK": "The Ask & Next Steps"
};

export async function saveAnalysisResults(supabase, analysis, report) {
  try {
    console.log("Preparing to save analysis results to database");
    
    if (!analysis || !analysis.sections || !Array.isArray(analysis.sections)) {
      throw new Error("Invalid analysis data format");
    }
    
    // Validate that we have all the expected section types and no extras
    const sectionTypes = analysis.sections.map(section => section.type);
    const unexpectedSections = sectionTypes.filter(type => !EXPECTED_SECTION_TYPES.includes(type));
    const missingSections = EXPECTED_SECTION_TYPES.filter(type => !sectionTypes.includes(type));
    
    if (unexpectedSections.length > 0) {
      console.warn(`Found unexpected section types: ${unexpectedSections.join(', ')}`);
    }
    
    if (missingSections.length > 0) {
      console.warn(`Missing expected section types: ${missingSections.join(', ')}`);
      
      // Add missing sections with default values
      for (const missingType of missingSections) {
        const title = LOCAL_SECTION_TITLES[missingType] || missingType;
        analysis.sections.push({
          type: missingType,
          title,
          score: 1.0,
          description: `⚠️ MISSING SECTION: ${title} is not present in this pitch deck`,
          strengths: [],
          weaknesses: [
            `Critical oversight: ${title} is missing`,
            "Incomplete pitch deck structure"
          ]
        });
      }
    }
    
    // Ensure no duplicate section types
    const uniqueSections = [];
    const seenTypes = new Set();
    
    for (const section of analysis.sections) {
      if (!seenTypes.has(section.type)) {
        seenTypes.add(section.type);
        uniqueSections.push(section);
      } else {
        console.warn(`Removing duplicate section of type: ${section.type}`);
      }
    }
    
    analysis.sections = uniqueSections;
    
    // Verify and recalculate overall score
    const sectionScores = analysis.sections.map(section => section.score || 0);
    const avgScore = sectionScores.reduce((a, b) => a + b, 0) / EXPECTED_SECTION_TYPES.length;
    const normalizedScore = Math.min(avgScore * 1.25, 5.0);
    const roundedNormalizedScore = parseFloat(normalizedScore.toFixed(1));
    
    console.log(`Score calculation check: Average=${avgScore.toFixed(2)}, Normalized=${normalizedScore.toFixed(2)}, Rounded=${roundedNormalizedScore}, Original=${analysis.overallScore}`);
    
    // Always use our calculated score to ensure consistency
    analysis.overallScore = roundedNormalizedScore;
    
    // Prepare company data - removed description field which doesn't exist
    const companyData = {
      name: report.title,
      overall_score: analysis.overallScore,
      report_id: report.id,
      user_id: report.user_id,
      created_at: new Date().toISOString(),
      assessment_points: analysis.assessmentPoints || [],
    };
    
    console.log("Inserting company record:", companyData);
    
    // Insert the company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single();
      
    if (companyError) {
      console.error("Error creating company record:", companyError);
      throw new Error(`Database error: ${companyError.message}`);
    }
    
    console.log("Company record created with ID:", company.id);
    
    // Update the report with the new company ID
    const { error: reportUpdateError } = await supabase
      .from('reports')
      .update({
        company_id: company.id,
        analysis_status: 'completed'
      })
      .eq('id', report.id);
      
    if (reportUpdateError) {
      console.error("Error updating report with company ID:", reportUpdateError);
      // Continue anyway as the main data is saved
    }
    
    // Process each section
    for (const section of analysis.sections) {
      // Convert the section type to a consistent format
      section.type = section.type.toUpperCase();
      
      if (!EXPECTED_SECTION_TYPES.includes(section.type)) {
        console.warn(`Skipping section with invalid type: ${section.type}`);
        continue;
      }
      
      console.log(`Processing section: ${section.type} with score ${section.score}`);
      
      // Create section
      const sectionData = {
        company_id: company.id,
        type: section.type,  // Keep the type field for backward compatibility
        section_type: section.type, // Use section_type as well to ensure compatibility
        title: section.title || LOCAL_SECTION_TITLES[section.type] || section.type,
        score: section.score,
        description: section.description
      };
      
      const { data: newSection, error: sectionError } = await supabase
        .from('sections')
        .insert(sectionData)
        .select()
        .single();
        
      if (sectionError) {
        console.error(`Error creating section ${section.type}:`, sectionError);
        // Continue with other sections
        continue;
      }
      
      console.log(`Section ${section.type} created with ID: ${newSection.id}`);
      
      // Process strengths
      if (section.strengths && section.strengths.length > 0) {
        for (const strength of section.strengths) {
          const { error: strengthError } = await supabase
            .from('section_details')
            .insert({
              section_id: newSection.id,
              detail_type: 'strength',
              content: strength
            });
            
          if (strengthError) {
            console.error(`Error adding strength for section ${section.type}:`, strengthError);
          } else {
            console.log(`Added strength for section ${newSection.id}`);
          }
        }
      }
      
      // Process weaknesses
      if (section.weaknesses && section.weaknesses.length > 0) {
        for (const weakness of section.weaknesses) {
          const { error: weaknessError } = await supabase
            .from('section_details')
            .insert({
              section_id: newSection.id,
              detail_type: 'weakness',
              content: weakness
            });
            
          if (weaknessError) {
            console.error(`Error adding weakness for section ${section.type}:`, weaknessError);
          } else {
            console.log(`Added weakness for section ${newSection.id}`);
          }
        }
      }
      
      // Process insights (if they exist)
      if (section.insights && section.insights.length > 0) {
        for (const insight of section.insights) {
          const { error: insightError } = await supabase
            .from('section_details')
            .insert({
              section_id: newSection.id,
              detail_type: 'insight',
              content: insight
            });
            
          if (insightError) {
            console.error(`Error adding insight for section ${section.type}:`, insightError);
          } else {
            console.log(`Added insight for section ${newSection.id}`);
          }
        }
      }
    }
    
    return company.id;
  } catch (error) {
    console.error("Error in saveAnalysisResults:", error);
    
    // Try to update the report with the error
    if (report && report.id && supabase) {
      try {
        const { error: updateError } = await supabase
          .from('reports')
          .update({
            analysis_status: 'failed',
            analysis_error: error instanceof Error ? error.message : String(error)
          })
          .eq('id', report.id);
          
        if (updateError) {
          console.error("Error updating report with failure status:", updateError);
        }
      } catch (updateError) {
        console.error("Failed to update report with error status:", updateError);
      }
    }
    
    throw error;
  }
}
