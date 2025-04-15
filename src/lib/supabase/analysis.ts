import { createClient } from '@supabase/supabase-js';
import { ParsedPdfSegment } from '../pdf-parser';
import { toast } from "@/hooks/use-toast";

const supabaseUrl = 'https://jhtnruktmtjqrfoiyrep.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodG5ydWt0bXRqcXJmb2l5cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NTczMzksImV4cCI6MjA1NzMzMzMzOX0._HZzAtVcTH_cdXZoxIeERNYqS6_hFEjcWbgHK3vxQBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Report = {
  id: string;
  title: string;
  description: string;
  pdf_url: string;
  created_at: string;
  sections?: string[];
  parsedSegments?: ParsedPdfSegment[];
  user_id?: string;
  analysis_status?: string;
  analysis_error?: string;
};

async function parsePdfFromBlob(blob: Blob): Promise<ParsedPdfSegment[]> {
  console.log("PDF parsing requested but implementation is elsewhere");
  return [];
}

export async function getReports() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user found');
    return [];
  }

  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: tableData, error: tableError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tableError) {
    console.error('Error fetching report from table:', tableError);
    throw tableError;
  }

  if (!tableData) {
    throw new Error('Report not found or you do not have permission to access it');
  }

  const report = tableData as Report;

  try {
    const pdfBlob = await downloadReport(report.pdf_url, user.id);
    
    const parsedSegments = await parsePdfFromBlob(pdfBlob);
    
    report.parsedSegments = parsedSegments;
    
    return report;
  } catch (error) {
    console.error('Error parsing PDF content:', error);
    return report;
  }
}

export async function downloadReport(fileUrl: string, userId: string) {
  const { data, error } = await supabase.storage
    .from('report_pdfs')
    .download(`${userId}/${fileUrl}`);

  if (error) {
    console.error('Error downloading report:', error);
    throw error;
  }

  return data;
}

export async function uploadReport(file: File, title: string, description: string, websiteUrl?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    console.log('Uploading report for user:', user.id);
    
    let scrapedContent = null;
    if (websiteUrl && websiteUrl.trim()) {
      try {
        console.log('Scraping website:', websiteUrl);
        const { data, error } = await supabase.functions.invoke('scrape-website', {
          body: { websiteUrl }
        });
        
        if (error) {
          console.error('Error scraping website:', error);
          toast({
            id: "scraping-error",
            title: "Website scraping failed",
            description: "Could not scrape the company website. Continuing without website data.",
            variant: "destructive"
          });
        } else if (data && data.scrapedContent) {
          scrapedContent = data.scrapedContent;
          console.log('Website scraped successfully:', scrapedContent.substring(0, 100) + '...');
          
          const { error: storeError } = await supabase
            .from('website_scrapes')
            .insert({
              url: websiteUrl,
              content: scrapedContent,
              status: 'success'
            });
            
          if (storeError) {
            console.error('Error storing scraped content:', storeError);
          }
          
          if (description) {
            description += '\n\nWebsite Content:\n' + scrapedContent;
          } else {
            description = 'Website Content:\n' + scrapedContent;
          }
        }
      } catch (scrapingError) {
        console.error('Error during website scraping:', scrapingError);
        
        try {
          await supabase
            .from('website_scrapes')
            .insert({
              url: websiteUrl,
              status: 'error',
              error_message: scrapingError instanceof Error ? scrapingError.message : String(scrapingError)
            });
        } catch (storeError) {
          console.error('Error storing scraping error:', storeError);
        }
      }
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('report_pdfs')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded to storage successfully, saving record to database');
    
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        pdf_url: fileName,
        user_id: user.id
      }])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting report record:', insertError);
      throw insertError;
    }

    console.log('Report record created successfully:', report);
    
    if (scrapedContent && report) {
      const { error: updateError } = await supabase
        .from('website_scrapes')
        .update({ report_id: report.id })
        .eq('url', websiteUrl)
        .is('report_id', null);
        
      if (updateError) {
        console.error('Error linking scrape to report:', updateError);
      }
    }
    
    return report as Report;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}

export async function analyzeReport(reportId: string) {
  try {
    console.log(`Analyzing report with ID: ${reportId}`);
    
    const requestBody = JSON.stringify({ reportId });
    console.log("Request body being sent:", requestBody);
    
    const { data, error } = await supabase.functions.invoke('analyze-pdf', {
      body: { reportId },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("Edge function response:", { data, error });
    
    if (error) {
      console.error('Error analyzing report:', error);
      console.error('Error object keys:', Object.keys(error));
      console.error('Error stringify:', JSON.stringify(error));
      throw error;
    }
    
    if (!data || data.error) {
      const errorMessage = data?.error || 'Unknown error during analysis';
      console.error('Analysis failed:', errorMessage);
      console.error('Complete response data:', data);
      throw new Error(errorMessage);
    }
    
    console.log('Analysis result:', data);
    
    await supabase
      .from('reports')
      .update({
        analysis_status: 'completed',
        company_id: data.companyId
      })
      .eq('id', reportId);
    
    return data;
  } catch (error) {
    console.error('Error in analyzeReport:', error);
    console.error('Error object keys:', Object.keys(error || {}));
    console.error('Error stringify:', JSON.stringify(error));
    
    toast({
      id: "analysis-error",
      title: "Analysis failed",
      description: error instanceof Error ? error.message : "An error occurred during analysis",
      variant: "destructive"
    });
    
    throw error;
  }
}

export async function analyzeReportDirect(file: File, title: string, description: string = '') {
  try {
    console.log('Converting file to base64...');
    
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    
    console.log('File converted to base64, calling analyze-pdf-direct function');
    
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

export async function uploadPublicReport(file: File, title: string, description: string = '', websiteUrl: string = '', email: string = '') {
  try {
    console.log('Uploading public report');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('email', email);
    
    if (description) {
      formData.append('description', description);
    }
    
    if (websiteUrl) {
      formData.append('websiteUrl', websiteUrl);
    }
    
    const response = await fetch("https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/handle-public-upload", {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Upload error response:", errorData);
      throw new Error(`Upload failed with status: ${response.status}${errorData.details ? ` - ${errorData.details}` : ''}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    return { id: result.reportId };
  } catch (error) {
    console.error('Error uploading public report:', error);
    throw error;
  }
}

export async function autoAnalyzePublicReport(reportId: string) {
  try {
    console.log('Auto-analyzing public report:', reportId);
    
    const { data, error } = await supabase.functions.invoke('analyze-public-pdf', {
      body: { reportId }
    });
    
    if (error) {
      console.error('Error auto-analyzing public report:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in autoAnalyzePublicReport:', error);
    throw error;
  }
}
