
import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob, ParsedPdfSegment } from '../pdf-parser';
import { toast } from "@/hooks/use-toast";

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
  submitter_email?: string;
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

  // Get user's email for matching with submitter_email
  // Using maybeSingle() instead of single() to avoid errors when no profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching user profile:', profileError);
    // Only show a toast if it's not the "no rows" error
    toast({
      title: "Error fetching profile",
      description: "There was an issue loading your profile information",
      variant: "destructive"
    });
  }
    
  const userEmail = profile?.email || user.email || '';
  console.log('User email for report matching:', userEmail);

  // Construct the filter to get all relevant reports:
  // 1. Reports that belong to the user directly
  // 2. Reports that have the user's email as submitter_email (case-insensitive)
  const filter = `user_id.eq.${user.id},submitter_email.ilike.${userEmail}`;

  console.log('Using filter for reports:', filter);

  // Get reports with the combined filter
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .or(filter)
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    throw tableError;
  }

  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData.length);
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

export async function downloadReport(fileUrl: string, userId?: string) {
  console.log('Downloading report with URL:', fileUrl);
  
  if (!fileUrl) {
    console.error('No file URL provided');
    throw new Error('No file URL provided');
  }
  
  try {
    // Step 1: Check if this is a path from the public_uploads bucket
    if (fileUrl.includes('/')) {
      console.log('Trying to download from public_uploads bucket first');
      try {
        const { data, error } = await supabase.storage
          .from('public_uploads')
          .download(fileUrl);
          
        if (!error && data) {
          console.log('Successfully downloaded from public_uploads bucket');
          return data;
        }
      } catch (publicError) {
        console.log('Error downloading from public_uploads:', publicError);
      }
    }
    
    // Step 2: Try the standard report_pdfs bucket with the provided path
    try {
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(fileUrl);

      if (!error && data) {
        console.log('Successfully downloaded with primary path from report_pdfs');
        return data;
      }
    } catch (primaryError) {
      console.error('Error with primary path, trying fallback:', primaryError);
    }
    
    // Step 3: Try with the simple filename (last part of path)
    const parts = fileUrl.split('/');
    const simpleFileName = parts[parts.length - 1];
    
    try {
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('report_pdfs')
        .download(simpleFileName);
        
      if (!fallbackError && fallbackData) {
        console.log('Successfully downloaded with fallback path');
        return fallbackData;
      }
    } catch (fallbackError) {
      console.error('Error with fallback path:', fallbackError);
    }
    
    // Step 4: Try with user ID if provided
    if (userId) {
      const userPath = `${userId}/${fileUrl}`;
      console.log('Trying with user path:', userPath);
      
      try {
        const { data: userPathData, error: userPathError } = await supabase.storage
          .from('report_pdfs')
          .download(userPath);
          
        if (!userPathError && userPathData) {
          console.log('Successfully downloaded with user path');
          return userPathData;
        }
      } catch (userPathError) {
        console.error('Failed with user path approach:', userPathError);
      }
    }
    
    throw new Error('All download attempts failed');
  } catch (error) {
    console.error('Failed to download report:', error);
    toast({
      title: "Error loading PDF",
      description: "Could not download the PDF file. Please try again later.",
      variant: "destructive"
    });
    throw error;
  }
}

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
