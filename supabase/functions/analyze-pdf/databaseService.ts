
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.29.0';

export interface AnalysisResult {
  overallScore: number;
  assessmentPoints: string[];
  sections: Array<{
    title: string;
    type: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    detailedContent: string;
  }>;
  slideBySlideNotes?: Array<{
    slideNumber: number;
    notes: string[];
  }>;
  improvementSuggestions?: string[];
}

export async function storeAnalysisResult(reportId: string, analysisResult: AnalysisResult) {
  console.log(`Storing analysis result for report ${reportId}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { error } = await supabase
    .from('reports')
    .update({
      analysis_result: analysisResult,
      analysis_status: 'completed'
    })
    .eq('id', reportId);
    
  if (error) {
    console.error("Error storing analysis result:", error);
    throw error;
  }
  
  console.log(`Analysis result stored successfully for report ${reportId}`);
}

export async function updateCompanyFromAnalysis(companyId: string, analysisResult: AnalysisResult) {
  console.log(`Updating company ${companyId} with analysis result`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { error } = await supabase
    .from('companies')
    .update({
      overall_score: analysisResult.overallScore,
      assessment_points: analysisResult.assessmentPoints
    })
    .eq('id', companyId);
    
  if (error) {
    console.error("Error updating company:", error);
    throw error;
  }
  
  console.log(`Company ${companyId} updated successfully`);
}

export async function createSectionsFromAnalysis(reportId: string, analysisResult: AnalysisResult) {
  console.log(`Creating sections for report ${reportId}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Get the company_id from the report
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('company_id')
    .eq('id', reportId)
    .single();
    
  if (reportError) {
    console.error("Error getting company_id from report:", reportError);
    throw new Error("Could not retrieve report information");
  }
  
  if (!report?.company_id) {
    console.log("No company_id found for this report - skipping section creation");
    return; // Don't throw an error, just return early
  }
  
  const companyId = report.company_id;
  
  // Clear existing sections for this company
  const { error: deleteError } = await supabase
    .from('sections')
    .delete()
    .eq('company_id', companyId);
    
  if (deleteError) {
    console.error("Error deleting existing sections:", deleteError);
    throw deleteError;
  }
  
  // Create new sections from analysis
  const sectionsToInsert = analysisResult.sections.map(section => ({
    company_id: companyId,
    type: section.type,
    title: section.title,
    score: section.score,
    strengths: section.strengths || [],
    weaknesses: section.weaknesses || [],
    detailed_content: section.detailedContent || section.description || ''
  }));
  
  if (sectionsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('sections')
      .insert(sectionsToInsert);
      
    if (insertError) {
      console.error("Error inserting sections:", insertError);
      throw insertError;
    }
    
    console.log(`Successfully created ${sectionsToInsert.length} sections for company ${companyId}`);
  }
}

export async function getExistingAnalysis(reportId: string) {
  console.log(`Checking for existing analysis for report ${reportId}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { data: report, error } = await supabase
    .from('reports')
    .select('analysis_result, analysis_status')
    .eq('id', reportId)
    .single();
    
  if (error) {
    console.error("Error checking existing analysis:", error);
    return null;
  }
  
  if (report?.analysis_result && report?.analysis_status === 'completed') {
    console.log(`Found existing analysis for report ${reportId}`);
    return report.analysis_result;
  }
  
  console.log(`No existing analysis found for report ${reportId}`);
  return null;
}
