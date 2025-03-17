
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
};

// Functions to interact with Supabase
export async function getReports() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Error fetching user:', authError);
    toast({
      title: "Authentication required",
      description: "You must be logged in to access reports.",
      variant: "destructive"
    });
    return [];
  }

  // Get reports from the reports table for the current user
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    toast({
      title: "Error loading reports",
      description: "There was a problem retrieving your reports.",
      variant: "destructive"
    });
    return [];
  }

  if (tableData && tableData.length > 0) {
    console.log(`Found ${tableData.length} reports for user ${user.id}`);
    return tableData as Report[];
  }

  console.log('No reports found for this user');
  return [];
}

export async function getReportById(id: string) {
  console.log('Fetching report with ID:', id);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Error fetching user:', authError);
    toast({
      title: "Authentication required",
      description: "You must be logged in to access this report.",
      variant: "destructive"
    });
    throw new Error('User not authenticated');
  }
  
  // Get the report from the reports table for the current user
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
    toast({
      title: "Error loading report",
      description: "There was a problem retrieving this report.",
      variant: "destructive"
    });
    throw tableError;
  }

  if (!tableData) {
    console.error(`Report with ID ${id} not found or not accessible to this user`);
    toast({
      title: "Report not found",
      description: "The requested report does not exist or you don't have permission to access it.",
      variant: "destructive"
    });
    throw new Error('Report not found or access denied');
  }

  console.log('Report found:', tableData);
  return tableData as Report;
}

export async function downloadReport(fileUrl: string, userId?: string) {
  console.log('Downloading report with URL:', fileUrl);
  
  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Error fetching user:', authError);
    toast({
      title: "Authentication required",
      description: "You must be logged in to download this report.",
      variant: "destructive"
    });
    throw new Error('User not authenticated');
  }
  
  // If userId is not provided, use current user's ID
  const currentUserId = userId || user.id;
  
  try {
    // First try with the user's path
    const userPath = `${currentUserId}/${fileUrl}`;
    console.log('Trying with user path:', userPath);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(userPath);
    
    if (error) {
      console.error('Error with user path, trying fallback:', error);
      
      // Try with the raw path as fallback
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('report_pdfs')
        .download(fileUrl);
        
      if (fallbackError) {
        console.error('Error with fallback path:', fallbackError);
        
        // Last attempt: try with just the filename
        const parts = fileUrl.split('/');
        const simpleFileName = parts[parts.length - 1];
        
        const { data: simpleData, error: simpleError } = await supabase.storage
          .from('report_pdfs')
          .download(simpleFileName);
          
        if (simpleError) {
          console.error('All download attempts failed:', simpleError);
          throw simpleError;
        }
        
        console.log('Successfully downloaded with simple filename');
        return simpleData;
      }
      
      console.log('Successfully downloaded with fallback path');
      return fallbackData;
    }

    console.log('Successfully downloaded with user path');
    return data;
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
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error fetching user:', authError);
      toast({
        title: "Authentication required",
        description: "You must be logged in to upload a report.",
        variant: "destructive"
      });
      throw new Error('User not authenticated');
    }
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    // Upload the file to storage with user path
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      toast({
        title: "Upload failed",
        description: "Could not upload the file. Please try again later.",
        variant: "destructive"
      });
      throw uploadError;
    }
    
    console.log('File uploaded to storage successfully, saving record to database');
    
    // Insert a record in the reports table with user_id
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        pdf_url: fileName,
        user_id: user.id,
        analysis_status: 'pending'
      }])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting report record:', insertError);
      toast({
        title: "Database error",
        description: "Could not save report information. Please try again later.",
        variant: "destructive"
      });
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
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error fetching user:', authError);
      toast({
        title: "Authentication required",
        description: "You must be logged in to analyze a report.",
        variant: "destructive"
      });
      throw new Error('User not authenticated');
    }
    
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
    
    // Get auth token for the edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Error getting auth session:', sessionError);
      toast({
        title: "Authentication error",
        description: "Could not verify your session. Please try again later.",
        variant: "destructive"
      });
      throw new Error('Session error');
    }
    
    // Call the edge function with authentication
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64: base64String 
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
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

// Function to get latest research that respects user authentication
export async function getLatestResearch(companyId: string, assessmentText: string) {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Error fetching user:', authError);
      throw new Error('User not authenticated');
    }
    
    // First check if the company belongs to the current user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, report_id')
      .eq('id', companyId)
      .maybeSingle();
      
    if (companyError) {
      console.error('Error checking company ownership:', companyError);
      throw companyError;
    }
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    // Check if the company's report belongs to the current user
    if (company.report_id) {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('user_id')
        .eq('id', company.report_id)
        .maybeSingle();
        
      if (reportError) {
        console.error('Error checking report ownership:', reportError);
        throw reportError;
      }
      
      if (!report || report.user_id !== user.id) {
        throw new Error('You do not have permission to access this company');
      }
    }
    
    // Now we can safely call the research function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Session error');
    }
    
    const { data, error } = await supabase.functions.invoke('research-with-perplexity', {
      body: { 
        companyId,
        assessmentText
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting latest research:', error);
    throw error;
  }
}
