
import { supabase } from "@/integrations/supabase/client";
import { parsePdfFromBlob, ParsedPdfSegment } from '../pdf-parser';
import { toast } from "sonner";

// Types for our database
export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  user_id: string;
  company_id?: string;
  analysis_status: string;
  analysis_error?: string;
  parsedSegments?: ParsedPdfSegment[];
};

// Functions to interact with Supabase

export async function getReports() {
  // Check for authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No authenticated session found');
    return [];
  }

  // Get reports from the reports table (RLS will filter for current user)
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .order('created_at', { ascending: false });

  if (tableError) {
    console.error('Error fetching reports from table:', tableError);
    throw tableError;
  }

  if (tableData && tableData.length > 0) {
    console.log('Found reports in table:', tableData);
    return tableData as Report[];
  }

  console.log('No reports found for this user');
  return [];
}

export async function getReportById(id: string) {
  console.log('Fetching report with ID:', id);
  
  // Check for authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No authenticated session found');
    throw new Error('User not authenticated');
  }
  
  // Get the report from the reports table (RLS will ensure user can only access their own)
  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*, companies!reports_company_id_fkey(id, name, overall_score)')
    .eq('id', id)
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
    throw tableError;
  }

  if (!tableData) {
    console.error('Report not found with ID:', id);
    throw new Error('Report not found');
  }

  console.log('Report found:', tableData);
  return tableData as Report;
}

export async function downloadReport(fileUrl: string, userId?: string) {
  console.log('Downloading report with URL:', fileUrl);
  
  // Check for authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No authenticated session found');
    throw new Error('User not authenticated');
  }
  
  try {
    // First try with the user ID included in path
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(`${session.user.id}/${fileUrl}`);

    if (error) {
      console.error('Error with primary path, trying fallback:', error);
      
      // Try with direct path (for files uploaded before RLS implementation)
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('report_pdfs')
          .download(fileUrl);
          
        if (fallbackError) {
          console.error('Error with fallback path:', fallbackError);
          
          // Last attempt with the provided userId if different from current
          if (userId && userId !== session.user.id) {
            const userPath = `${userId}/${fileUrl}`;
            console.log('Trying with alternate user path:', userPath);
            
            try {
              const { data: userPathData, error: userPathError } = await supabase.storage
                .from('report_pdfs')
                .download(userPath);
                
              if (userPathError) {
                console.error('All download attempts failed:', userPathError);
                throw userPathError;
              }
              
              console.log('Successfully downloaded with alternate user path');
              return userPathData;
            } catch (nestedError) {
              console.error('Failed with alternate user path approach:', nestedError);
              throw nestedError;
            }
          }
          
          throw fallbackError;
        }
        
        console.log('Successfully downloaded with fallback path');
        return fallbackData;
      } catch (innerError) {
        console.error('Error in fallback approach:', innerError);
        throw innerError;
      }
    }

    console.log('Successfully downloaded with primary path');
    return data;
  } catch (error) {
    console.error('Failed to download report:', error);
    toast.error("Error loading PDF",
      {
        description: "Could not download the PDF file. Please try again later."
      }
    );
    throw error;
  }
}

export async function uploadReport(file: File, title: string, description: string = '', websiteUrl?: string) {
  try {
    // Check for authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('Authentication error:', authError);
      throw new Error('User not authenticated');
    }
    
    const user = session.user;
    console.log('Uploading report for user:', user.id);
    
    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    // Upload the file to storage with user ID in path for RLS
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
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
      throw insertError;
    }

    console.log('Report record created successfully:', report);
    
    return report as Report;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}

export async function analyzeReport(reportId: string) {
  try {
    console.log('Starting analysis for report:', reportId);
    
    // Call the analyze-pdf edge function
    const { data, error } = await supabase.functions.invoke('analyze-pdf', {
      body: { reportId }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf function:', error);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: error.message
        })
        .eq('id', reportId);
        
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      // Update report status to failed
      await supabase
        .from('reports')
        .update({
          analysis_status: 'failed',
          analysis_error: errorMessage
        })
        .eq('id', reportId);
        
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    // Update report status to completed
    await supabase
      .from('reports')
      .update({
        analysis_status: 'completed',
        company_id: data.companyId
      })
      .eq('id', reportId);
    
    return data;
  } catch (error) {
    console.error('Error analyzing report:', error);
    throw error;
  }
}

export async function analyzeReportDirect(file: File, title: string, description: string = '') {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }
    
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
    
    // Call the edge function including user ID
    const { data, error } = await supabase.functions.invoke('analyze-pdf-direct', {
      body: { 
        title, 
        description, 
        pdfBase64: base64String,
        userId: session.user.id
      }
    });
    
    if (error) {
      console.error('Error invoking analyze-pdf-direct function:', error);
      
      toast.error("Analysis failed", {
        description: "There was a problem analyzing the report. Please try again later."
      });
      
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || "Unknown error occurred during analysis";
      console.error('API returned error:', errorMessage);
      
      toast.error("Analysis failed", {
        description: errorMessage
      });
      
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    toast.success("Analysis complete", {
      description: "Your pitch deck has been successfully analyzed"
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing report directly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (!errorMessage.includes("analysis failed")) {
      toast.error("Analysis failed", {
        description: "Could not analyze the report. Please try again later."
      });
    }
    
    throw error;
  }
}
