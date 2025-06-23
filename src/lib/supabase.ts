
import { supabase } from '@/integrations/supabase/client';

export interface Report {
  id: string;
  title: string;
  description?: string;
  pdf_url: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  is_public_submission?: boolean;
  submitter_email?: string;
  analysis_status?: string;
  analysis_error?: string;
}

export async function uploadReport(
  file: File, 
  title: string, 
  description?: string, 
  websiteUrl?: string
): Promise<Report> {
  console.log('=== UPLOAD REPORT DEBUG START ===');
  console.log('Upload parameters:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    title,
    hasDescription: !!description,
    websiteUrl
  });

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('User must be authenticated to upload reports');
    }

    console.log('Authenticated user:', user.id);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${timestamp}.${fileExtension}`;
    const filePath = `${user.id}/${fileName}`;

    console.log('Generated file path:', filePath);

    // Upload file to storage with correct bucket name
    console.log('Starting file upload to report_pdfs bucket...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Create report record in database
    console.log('Creating report record in database...');
    const reportData = {
      title,
      description: description || null,
      pdf_url: fileName, // Store just the filename, not the full path
      user_id: user.id,
      is_public_submission: false,
      analysis_status: 'pending'
    };

    console.log('Report data to insert:', reportData);

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (reportError) {
      console.error('Database insert error:', reportError);
      
      // Clean up uploaded file if database insert fails
      console.log('Cleaning up uploaded file due to database error...');
      await supabase.storage
        .from('report_pdfs')
        .remove([filePath]);
      
      throw new Error(`Failed to create report record: ${reportError.message}`);
    }

    console.log('Report created successfully:', report);
    console.log('=== UPLOAD REPORT DEBUG END ===');

    return report;

  } catch (error) {
    console.error('=== UPLOAD REPORT ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function analyzeReport(reportId: string) {
  console.log('Starting analysis for report:', reportId);
  
  try {
    const { data, error } = await supabase.functions.invoke('analyze-pdf', {
      body: { reportId }
    });

    if (error) {
      console.error('Analysis error:', error);
      throw new Error(`Failed to start analysis: ${error.message}`);
    }

    console.log('Analysis started successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in analyzeReport:', error);
    throw error;
  }
}

export * from './supabase/reports';
