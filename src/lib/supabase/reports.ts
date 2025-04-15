import { supabase } from "@/integrations/supabase/client";
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

export async function downloadReport(fileUrl: string, userId?: string) {
  console.log('Downloading report with URL:', fileUrl);
  
  if (!fileUrl) {
    console.error('No file URL provided');
    throw new Error('No file URL provided');
  }
  
  try {
    // First check if this is from an email submission by querying the database
    const { data: emailSubmission } = await supabase
      .from('email_submissions')
      .select('attachment_url')
      .eq('attachment_url', fileUrl)
      .maybeSingle();
      
    if (emailSubmission) {
      console.log('This file is from an email submission with attachment URL:', emailSubmission.attachment_url);
    }
    
    // Step 1: If the URL starts with email_attachments, try to download from that bucket first
    if (fileUrl.includes('email_attachments') || emailSubmission) {
      const attachmentPath = emailSubmission?.attachment_url || fileUrl;
      console.log('Trying to download from email_attachments bucket with path:', attachmentPath);
      
      try {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .download(attachmentPath);
          
        if (!error && data) {
          console.log('Successfully downloaded from email_attachments bucket');
          return data;
        } else {
          console.log('Failed to download from email_attachments with path, trying without folder:', attachmentPath);
          
          // Try with just the filename (without folders)
          const filename = attachmentPath.split('/').pop();
          const { data: altData, error: altError } = await supabase.storage
            .from('email_attachments')
            .download(filename || attachmentPath);
            
          if (!altError && altData) {
            console.log('Successfully downloaded from email_attachments with just filename');
            return altData;
          }
        }
      } catch (emailError) {
        console.log('Error downloading from email_attachments:', emailError);
      }
    }
    
    // Step 2: Check if the fileUrl already has a proper path format (like 'user_id/filename.pdf')
    if (fileUrl.includes('/')) {
      console.log('File URL contains a path separator, attempting to download directly:', fileUrl);
      try {
        const { data, error } = await supabase.storage
          .from('report_pdfs')
          .download(fileUrl);
        
        if (!error && data) {
          console.log('Successfully downloaded file with direct path:', fileUrl);
          return data;
        }
      } catch (directPathError) {
        console.error('Error downloading with direct path:', directPathError);
      }
    }
    
    // Step 3: Try the standard report_pdfs bucket with userId prefixed path
    if (userId) {
      try {
        const fullPath = `${userId}/${fileUrl}`;
        console.log('Trying report_pdfs bucket with user path:', fullPath);
        
        const { data, error } = await supabase.storage
          .from('report_pdfs')
          .download(fullPath);

        if (!error && data) {
          console.log('Successfully downloaded from report_pdfs with user path:', fullPath);
          return data;
        }
      } catch (userPathError) {
        console.error('Error with user path, trying other approaches:', userPathError);
      }
    }
    
    // Step 4: Try public-uploads path for public submissions
    try {
      const publicPath = `public-uploads/${fileUrl}`;
      console.log('Trying report_pdfs bucket with public-uploads path:', publicPath);
      
      const { data, error } = await supabase.storage
        .from('report_pdfs')
        .download(publicPath);
        
      if (!error && data) {
        console.log('Successfully downloaded from public-uploads path');
        return data;
      }
    } catch (publicPathError) {
      console.error('Error with public-uploads path:', publicPathError);
    }
    
    // Step 5: Try with the simple filename (last part of path)
    const parts = fileUrl.split('/');
    const simpleFileName = parts[parts.length - 1];
    
    try {
      console.log('Trying report_pdfs bucket with simple filename:', simpleFileName);
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('report_pdfs')
        .download(simpleFileName);
        
      if (!fallbackError && fallbackData) {
        console.log('Successfully downloaded with fallback simple filename path');
        return fallbackData;
      }
    } catch (fallbackError) {
      console.error('Error with fallback path:', fallbackError);
    }
    
    // Step 6: Final attempt - check if this is from an email submission
    const { data: emailData } = await supabase
      .from('email_submissions')
      .select('attachment_url')
      .filter('attachment_url', 'ilike', `%${simpleFileName}%`)
      .maybeSingle();
      
    if (emailData?.attachment_url) {
      console.log('Found matching email attachment:', emailData.attachment_url);
      const { data: emailAttachment, error: emailError } = await supabase.storage
        .from('email_attachments')
        .download(emailData.attachment_url);
        
      if (!emailError && emailAttachment) {
        console.log('Successfully downloaded from email_attachments after lookup');
        return emailAttachment;
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
    // First, check if the user has reached their analysis limit
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's current analysis count and max allowed
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('max_analysis_allowed, analysis_count')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw new Error('Error fetching user data');
    }

    if (!userData) {
      console.error('User profile not found');
      throw new Error('User profile not found');
    }

    if (userData.analysis_count >= userData.max_analysis_allowed) {
      toast({
        id: "analysis-limit-reached",
        title: "Analysis limit reached",
        description: `You have reached your maximum number of ${userData.max_analysis_allowed} allowed analyses.`,
        variant: "destructive"
      });
      throw new Error(`You have reached your maximum number of allowed analyses (${userData.max_analysis_allowed})`);
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
    
    // Update analysis count for the user after successful analysis
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        analysis_count: userData.analysis_count + 1 
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error updating analysis count:', updateError);
      // Non-blocking error, continue with the rest of the function
    }
    
    toast({
      id: "analysis-success-direct",
      title: "Analysis complete",
      description: "Your pitch deck has been successfully analyzed",
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing report directly:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Don't show duplicate toast if it's already showing analysis failed
    if (!errorMessage.includes("analysis failed") && !errorMessage.includes("maximum number of allowed analyses")) {
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
