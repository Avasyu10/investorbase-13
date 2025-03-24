
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Upload a document to the VC documents bucket
 * 
 * @param file File to upload
 * @param userId User ID of the owner
 * @param options Additional options
 * @returns URL of the uploaded file
 */
export async function uploadVCDocument(
  file: File, 
  userId: string,
  options: { 
    useSignedUrls?: boolean,
    showToasts?: boolean
  } = { useSignedUrls: true, showToasts: true }
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    let filePath = `${userId}/${fileName}`;
    
    console.log(`Uploading VC document: ${filePath}`);
    
    if (options.useSignedUrls) {
      // Try to get a signed URL from our edge function first
      try {
        const { data, error } = await supabase.functions.invoke('handle-vc-document-upload', {
          body: {
            userId,
            filePath,
            fileType: file.type,
            fileSize: file.size
          }
        });
        
        if (error) {
          console.error("Error getting signed URL:", error);
          throw error;
        }
        
        if (data.signedUrl) {
          console.log("Got signed URL, uploading directly...");
          
          // Upload with the signed URL
          const uploadResponse = await fetch(data.signedUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type
            },
            body: file
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`Upload with signed URL failed: ${uploadResponse.status}`);
          }
          
          console.log("Uploaded successfully with signed URL");
          return data.path || filePath;
        }
      } catch (signedUrlError) {
        console.error("Signed URL failed, falling back to standard upload:", signedUrlError);
        // Fall back to standard upload
      }
    }
    
    // Standard upload path
    const directUpload = async (path: string): Promise<string> => {
      const { error } = await supabase.storage
        .from('vc-documents')
        .upload(path, file, { 
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) {
        console.error(`Upload failed for path ${path}:`, error);
        throw error;
      }
      
      return path;
    };
    
    // Try with user ID prefix
    try {
      return await directUpload(filePath);
    } catch (error: any) {
      console.error("Upload with user ID prefix failed:", error);
      
      // Try without user ID prefix
      try {
        filePath = fileName;
        return await directUpload(filePath);
      } catch (fallbackError: any) {
        console.error("All upload attempts failed:", fallbackError);
        throw fallbackError;
      }
    }
    
  } catch (error: any) {
    console.error("Document upload error:", error);
    
    if (options.showToasts) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload document",
        variant: "destructive"
      });
    }
    
    return null;
  }
}

/**
 * Download a VC document
 * 
 * @param documentPath Path of the document in storage
 * @param userId User ID of the owner
 * @returns Blob of the document
 */
export async function downloadVCDocument(documentPath: string, userId: string): Promise<Blob | null> {
  try {
    // First try with the path as is
    let { data, error } = await supabase.storage
      .from('vc-documents')
      .download(documentPath);
      
    if (error || !data) {
      console.log(`Error downloading with path ${documentPath}:`, error);
      
      // Try with user ID prefix if it doesn't already have it
      if (!documentPath.startsWith(`${userId}/`)) {
        const pathWithUser = `${userId}/${documentPath}`;
        
        console.log(`Trying with user ID prefix: ${pathWithUser}`);
        
        const { data: userPrefixData, error: userPrefixError } = await supabase.storage
          .from('vc-documents')
          .download(pathWithUser);
          
        if (!userPrefixError && userPrefixData) {
          return userPrefixData;
        }
        
        console.log(`Error with user ID prefix:`, userPrefixError);
      }
      
      // Try with just the filename (last part of the path)
      const parts = documentPath.split('/');
      const simplePath = parts[parts.length - 1];
      
      console.log(`Trying with simple filename: ${simplePath}`);
      
      const { data: simpleData, error: simpleError } = await supabase.storage
        .from('vc-documents')
        .download(simplePath);
        
      if (!simpleError && simpleData) {
        return simpleData;
      }
      
      console.log(`Error with simple filename:`, simpleError);
      
      console.error('All download attempts failed');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error downloading document:", error);
    return null;
  }
}
