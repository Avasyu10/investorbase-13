
import { supabase } from '@/integrations/supabase/client';

export async function downloadReport(fileUrl: string, userId: string): Promise<Blob> {
  console.log('Attempting to download report:', { fileUrl, userId });
  
  // Try multiple download strategies
  let lastError: any = null;
  
  // Strategy 1: Try with user ID prefix (for dashboard uploads)
  try {
    const userPath = `${userId}/${fileUrl}`;
    console.log('Trying user path:', userPath);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(userPath);

    if (error) {
      console.log('User path failed:', error.message);
      lastError = error;
    } else if (data) {
      console.log('Successfully downloaded with user path');
      return data;
    }
  } catch (error) {
    console.log('Error with user path:', error);
    lastError = error;
  }
  
  // Strategy 2: Try direct path (for files that may already include the user ID)
  try {
    console.log('Trying direct path:', fileUrl);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(fileUrl);

    if (error) {
      console.log('Direct path failed:', error.message);
      lastError = error;
    } else if (data) {
      console.log('Successfully downloaded with direct path');
      return data;
    }
  } catch (error) {
    console.log('Error with direct path:', error);
    lastError = error;
  }
  
  // Strategy 3: Try just the filename
  try {
    const filename = fileUrl.split('/').pop() || fileUrl;
    console.log('Trying filename only:', filename);
    
    const { data, error } = await supabase.storage
      .from('report_pdfs')
      .download(filename);

    if (error) {
      console.log('Filename path failed:', error.message);
      lastError = error;
    } else if (data) {
      console.log('Successfully downloaded with filename only');
      return data;
    }
  } catch (error) {
    console.log('Error with filename path:', error);
    lastError = error;
  }
  
  // If all strategies failed, throw the last error
  console.error('All download strategies failed:', lastError);
  throw lastError || new Error('Failed to download report from all attempted paths');
}
