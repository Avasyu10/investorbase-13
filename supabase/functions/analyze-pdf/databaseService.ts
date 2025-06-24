
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveAnalysisResults(reportId: string, userId: string, analysisResult: any): Promise<string> {
  console.log('Starting to save analysis results to database');
  
  // Extract company info from analysis result if available
  const companyInfo = analysisResult.companyInfo || {};
  const stage = companyInfo.stage || '';
  const industry = companyInfo.industry || '';
  const website = companyInfo.website || '';
  const description = companyInfo.description || '';
  
  console.log('Extracted company info:', { stage, industry, website, description });

  // Save the complete analysis result to reports table
  const { error: reportError } = await supabase
    .from('reports')
    .update({ 
      analysis_result: analysisResult,
      status: 'completed'
    })
    .eq('id', reportId);

  if (reportError) {
    console.error('Error updating report:', reportError);
    throw new Error(`Failed to update report: ${reportError.message}`);
  }

  // Create company record
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: analysisResult.companyName || 'Unknown Company',
      overall_score: analysisResult.overallScore || 0,
      assessment_points: analysisResult.assessmentPoints || [],
      report_id: reportId,
      user_id: userId,
      stage: stage, // Use extracted stage
      industry: industry, // Use extracted industry
      website: website, // Use extracted website
      introduction: description // Use extracted description as introduction
    })
    .select()
    .single();

  if (companyError) {
    console.error('Error creating company:', companyError);
    throw new Error(`Failed to create company: ${companyError.message}`);
  }

  console.log('Company created successfully:', companyData.id);
  const companyId = companyData.id;

  // Create sections
  if (analysisResult.sections && analysisResult.sections.length > 0) {
    const sectionsToInsert = analysisResult.sections.map((section: any) => ({
      company_id: companyId,
      type: section.type,
      title: section.title,
      score: section.score || 0,
      strengths: section.strengths || [],
      weaknesses: section.weaknesses || [],
      detailed_content: section.detailedContent || section.description || '',
      description: section.description || ''
    }));

    const { error: sectionsError } = await supabase
      .from('sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error('Error creating sections:', sectionsError);
      throw new Error(`Failed to create sections: ${sectionsError.message}`);
    }

    console.log('Sections created successfully:', sectionsToInsert.length);
  }

  console.log('Analysis results saved successfully');
  return companyId;
}

export async function getReportData(reportId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    throw new Error(`Failed to get report: ${error.message}`);
  }

  return data;
}

export async function downloadPdfFromStorage(fileName: string, userId?: string) {
  // First try direct download
  console.log(`Downloading PDF: ${fileName} from bucket: report-pdfs`);
  
  let { data, error } = await supabase.storage
    .from('report-pdfs')
    .download(fileName);

  if (error) {
    console.log(`Direct download failed: ${JSON.stringify(error)}`);
    
    // Try user-specific path if userId is provided
    if (userId) {
      const userSpecificPath = `${userId}/${fileName}`;
      console.log(`Trying user-specific path: ${userSpecificPath}`);
      
      const result = await supabase.storage
        .from('report-pdfs')
        .download(userSpecificPath);
      
      data = result.data;
      error = result.error;
      
      if (!error && data) {
        console.log(`Successfully downloaded via user-specific path, size: ${data.size}`);
      }
    }
  }

  if (error || !data) {
    throw new Error(`Failed to download PDF: ${error?.message || 'No data received'}`);
  }

  console.log(`PDF downloaded successfully, size: ${data.size}`);
  return data;
}
