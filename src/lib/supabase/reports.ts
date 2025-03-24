import { supabase } from "@/integrations/supabase/client";

// Types for our database
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  analysis_status: string;
  analysis_error?: string;
  parsedSegments?: ParsedPdfSegment[];
  is_public_submission?: boolean;
  submission_form_id?: string;
};

// Functions to interact with Supabase

export async function getReports() {
  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    toast({
      title: "Authentication required",
      description: "Please sign in to view reports",
      variant: "destructive"
    });
    return [];
  }

  // Get reports from the reports table that belong to the user
  // or are public submissions assigned to the user
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .or(`user_id.eq.${user.id},and(is_public_submission.eq.true,user_id.eq.${user.id})`)
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    throw tableError;
  }

  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData);
    return tableData as Report[];
  }

  console.log('No reports found');
  return [];
}

export async function getReportById(id: string) {
  console.log('Fetching report with ID:', id);
  
  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    toast({
      title: "Authentication required",
      description: "Please sign in to view reports",
      variant: "destructive"
    });
    throw new Error('Authentication required');
  }
  
  // First try to get reports directly owned by the user or public submissions assigned to the user
  let { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score, user_id)')
    .eq('id', id)
    .or(`user_id.eq.${user.id},and(is_public_submission.eq.true,user_id.eq.${user.id})`)
    .maybeSingle();

  // If report not found by user_id, check if user has access through company ownership
  if (!tableData && !tableError) {
    console.log('Report not found by direct ownership, checking company access');
    
    // Get reports where the user owns the associated company
    const { data: companyReportData, error: companyReportError } = await supabase
      .from('reports')
      .select('*, companies!reports_company_id_fkey(id, name, overall_score, user_id)')
      .eq('id', id)
      .not('company_id', 'is', null)
      .maybeSingle();
    
    if (companyReportError) {
      console.error('Error checking company report access:', companyReportError);
      throw companyReportError;
    }
    
    // If we found a report and the company exists and is owned by the user
    if (companyReportData && 
        companyReportData.companies && 
        companyReportData.companies.user_id === user.id) {
      console.log('User has access through company ownership');
      tableData = companyReportData;
    } else {
      console.error('Report not found or user does not have access');
      throw new Error('Report not found or you do not have permission to access it');
    }
  } else if (tableError) {
    console.error('Error fetching report from table:', tableError);
    throw tableError;
  }

  if (!tableData) {
    console.error('Report not found with ID:', id);
    throw new Error('Report not found or you do not have permission to access it');
  }

  console.log('Report found:', tableData);
  return tableData as Report;
}

export const downloadReport = async (pdfPath: string, userId: string): Promise<Blob | null> => {
  if (!pdfPath || !userId) {
    console.error("Missing PDF path or user ID for download");
    return null;
  }
  
  console.log(`Downloading report with URL: ${pdfPath}`);
  
  // Clean up the path - if it contains the bucket name, extract just the path
  let storageBucket = 'report_pdfs'; // Default bucket
  let storagePath = pdfPath;
  
  // Check if this is an email attachment
  if (pdfPath.includes('email_attachments')) {
    storageBucket = 'email_attachments';
    
    // Extract just the path portion for email attachments
    if (pdfPath.startsWith('email_attachments/')) {
      storagePath = pdfPath.replace('email_attachments/', '');
    }
    
    console.log(`Trying to download from ${storageBucket} bucket`);
  }
  // Check if this is from public uploads
  else if (pdfPath.includes('public_uploads')) {
    storageBucket = 'public_uploads';
    
    // Extract just the path portion
    if (pdfPath.startsWith('public_uploads/')) {
      storagePath = pdfPath.replace('public_uploads/', '');
    }
    
    console.log(`Trying to download from ${storageBucket} bucket`);
  }
  
  // Try downloading from the identified bucket
  try {
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .download(storagePath);
      
    if (error) {
      console.error(`Error downloading from ${storageBucket}:`, error);
      // We'll try alternatives below
    } else if (data) {
      console.log(`Successfully downloaded file from ${storageBucket}, size: ${data.size} bytes`);
      return data;
    }
  } catch (error) {
    console.error(`Error downloading from ${storageBucket}:`, error);
    // Continue to fallbacks
  }
  
  // If we reach here, the primary download attempt failed
  console.log("Primary download attempt failed, trying alternatives...");
  
  // Generate an array of bucket and path combinations to try
  const bucketPathCombinations = [
    { bucket: 'email_attachments', path: storagePath },
    { bucket: 'email_attachments', path: storagePath.includes('/') ? storagePath.split('/').pop() : storagePath },
    { bucket: 'public_uploads', path: storagePath },
    { bucket: 'public_uploads', path: storagePath.includes('/') ? storagePath.split('/').pop() : storagePath },
    { bucket: 'report_pdfs', path: storagePath },
    { bucket: 'report_pdfs', path: storagePath.includes('/') ? storagePath.split('/').pop() : storagePath }
  ];
  
  // Try each combination
  for (const { bucket, path } of bucketPathCombinations) {
    if (!path) continue; // Skip if path is null
    
    try {
      console.log(`Trying alternative: bucket=${bucket}, path=${path}`);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
        
      if (error) {
        console.error(`Error downloading from ${bucket}/${path}:`, error);
        continue;
      }
      
      if (data && data.size > 0) {
        console.log(`Successfully downloaded file from ${bucket}/${path}, size: ${data.size} bytes`);
        return data;
      }
    } catch (error) {
      console.error(`Error downloading from ${bucket}/${path}:`, error);
      continue;
    }
  }
  
  // If we've tried all combinations and none worked
  console.error("All download attempts failed");
  throw new Error("All download attempts failed");
};

export async function uploadReport(file: File, title: string, description: string = '') {
  try {
    console.log('Uploading report');
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      toast({
        title: "Authentication required",
        description: "Please sign in to upload reports",
        variant: "destructive"
      });
      throw new Error('Authentication required');
    }
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // Upload the file to storage without user path
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(fileName, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded to storage successfully, saving record to database');
    
    // Insert a record in the reports table with user_id set to the current user's ID
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        pdf_url: fileName,
        analysis_status: 'pending',
        user_id: user.id  // Set the user_id
      }])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting report record:', insertError);
      throw insertError;
    }

    console.log('Report record created successfully:', report);
    
    return report as Report;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}

export async function analyzeReportDirect(file: File, title: string, description: string = '') {
  try {
    console.log('Converting file to base64...');
    
    // Convert file to base64
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract just the base64 data part
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    
    console.log('File converted to base64, calling analyze-pdf-direct function');
    
    // Call the edge function without authentication
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64: base64String 
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      toast({
        id: "analysis-error-direct-1",
        title: "Analysis failed",
        description: "There was a problem analyzing the report. Please try again later.",
        variant: "destructive"
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      toast({
        id: "analysis-error-direct-2",
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    toast({
      id: "analysis-success-direct",
      title: "Analysis complete",
      description: "Your pitch deck has been successfully analyzed",
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing report directly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (!errorMessage.includes("analysis failed")) {
      toast({
        id: "analysis-error-direct-3",
        title: "Analysis failed",
        description: "Could not analyze the report. Please try again later.",
        variant: "destructive"
      });
    }
    
    throw error;
  }
}

// Export the functions
export { 
  getReports,
  getReportById,
  downloadReport,
  uploadReport,
  analyzeReportDirect
};
