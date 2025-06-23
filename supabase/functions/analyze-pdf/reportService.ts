
export class ReportService {
  constructor(private supabase: any) {}

  async updateReportWithResults(reportId: string, analysisResult: any, companyId?: string) {
    console.log('Updating report with results:', { reportId, companyId, hasAnalysisResult: !!analysisResult });
    
    const updateData: any = {
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      overall_score: analysisResult.overallScore
    };

    if (companyId) {
      updateData.company_id = companyId;
    }

    const { error } = await this.supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report:', error);
      throw new Error(`Failed to update report: ${error.message}`);
    }

    console.log('Report updated successfully');
  }
}
