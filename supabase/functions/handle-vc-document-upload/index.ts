
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Missing Supabase environment variables",
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse the request body
    const requestData = await req.json();
    console.log("Request data:", JSON.stringify(requestData));
    
    const { action } = requestData;
    
    // Handle different actions
    if (action === 'download') {
      return await handleDownload(requestData, supabase, corsHeaders);
    } else if (action === 'upload') {
      return await handleUpload(requestData, supabase, corsHeaders);
    } else if (action === 'get_url') {
      return await handleGetUrl(requestData, supabase, corsHeaders);
    } else {
      // Default to old behavior for backward compatibility
      const { userId, filePath, fileType, fileSize } = requestData;
      
      if (!userId || (!filePath && action !== 'download')) {
        return new Response(
          JSON.stringify({
            error: "Missing required parameters",
            success: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`Preparing signed URL for user ${userId}, path: ${filePath}`);
      
      // Generate a signed URL for upload
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('vc-documents')
        .createSignedUploadUrl(filePath);
      
      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError);
        
        return new Response(
          JSON.stringify({
            error: "Failed to create signed upload URL",
            details: signedUrlError.message,
            success: false,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          signedUrl: signedUrlData.signedUrl,
          path: signedUrlData.path,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Function to handle document downloads
async function handleDownload(
  requestData: any, 
  supabase: any, 
  corsHeaders: any
): Promise<Response> {
  const { userId, companyId, documentType } = requestData;
  
  console.log(`Handling download request:`, JSON.stringify({
    userId,
    companyId,
    documentType
  }));

  try {
    let path: string | null = null;
    
    // Case 1: Download a fund thesis document
    if (userId && documentType === 'fund_thesis') {
      console.log(`Looking for fund thesis document for user ${userId}`);
      
      // Find the user's fund thesis document
      const { data: vcProfileData, error: profileError } = await supabase
        .from('vc_profiles')
        .select('fund_thesis_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching VC profile:", profileError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch VC profile",
            details: profileError.message,
            success: false,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (vcProfileData?.fund_thesis_url) {
        console.log(`Found fund thesis URL: ${vcProfileData.fund_thesis_url}`);
        // Make sure we have the direct path without userId prefix (will be added in download)
        path = vcProfileData.fund_thesis_url.includes('/') 
          ? vcProfileData.fund_thesis_url 
          : `${userId}/${vcProfileData.fund_thesis_url}`;
      } else {
        console.log('No fund thesis URL found in profile');
        
        // Try to find any document in the user's folder that might be a fund thesis
        const { data: folderData, error: folderError } = await supabase.storage
          .from('vc-documents')
          .list(`${userId}`);

        if (folderError) {
          console.error("Error listing user folder:", folderError);
          return new Response(
            JSON.stringify({
              error: "Failed to list documents",
              details: folderError.message,
              success: false,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (folderData && folderData.length > 0) {
          // Look for PDF files that might be fund thesis
          const pdfFiles = folderData.filter(file => 
            file.name.toLowerCase().endsWith('.pdf') && 
            (file.name.toLowerCase().includes('fund') || 
             file.name.toLowerCase().includes('thesis'))
          );
          
          if (pdfFiles.length > 0) {
            path = `${userId}/${pdfFiles[0].name}`;
            console.log(`Found potential fund thesis: ${path}`);
          } else if (folderData.some(file => file.name.toLowerCase().endsWith('.pdf'))) {
            // If no specifically named fund thesis, try the first PDF
            const firstPdf = folderData.find(file => file.name.toLowerCase().endsWith('.pdf'));
            if (firstPdf) {
              path = `${userId}/${firstPdf.name}`;
              console.log(`Using first PDF as fund thesis: ${path}`);
            }
          }
        }
      }
      
      if (!path) {
        console.log("No fund thesis document found for user:", userId);
        return new Response(
          JSON.stringify({
            error: "No fund thesis document found for this user",
            success: false,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    // Case 2: Download a company pitch deck
    else if (companyId) {
      console.log(`Looking for pitch deck for company ${companyId}`);
      
      // Find the company's report to get the PDF URL
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('pdf_url, user_id')
        .eq('company_id', companyId)
        .single();

      if (reportError && reportError.code !== 'PGRST116') {
        console.error("Error fetching report:", reportError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch report data",
            details: reportError.message,
            success: false,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (reportData?.pdf_url && reportData?.user_id) {
        console.log(`Found report with PDF: ${reportData.pdf_url}`);
        path = reportData.pdf_url.includes('/') 
          ? reportData.pdf_url 
          : `${reportData.user_id}/${reportData.pdf_url}`;
      } else {
        // If no report is found, try to find the company record
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('report_id')
          .eq('id', companyId)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          console.error("Error fetching company:", companyError);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch company data",
              details: companyError.message,
              success: false,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (companyData?.report_id) {
          const { data: reportFromCompany, error: reportFromCompanyError } = await supabase
            .from('reports')
            .select('pdf_url, user_id')
            .eq('id', companyData.report_id)
            .single();

          if (reportFromCompanyError && reportFromCompanyError.code !== 'PGRST116') {
            console.error("Error fetching report via company:", reportFromCompanyError);
            return new Response(
              JSON.stringify({
                error: "Failed to fetch report data via company",
                details: reportFromCompanyError.message,
                success: false,
              }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          if (reportFromCompany?.pdf_url && reportFromCompany?.user_id) {
            console.log(`Found report via company with PDF: ${reportFromCompany.pdf_url}`);
            path = reportFromCompany.pdf_url.includes('/')
              ? reportFromCompany.pdf_url
              : `${reportFromCompany.user_id}/${reportFromCompany.pdf_url}`;
          }
        }
      }
      
      if (!path) {
        console.log("No pitch deck found for company:", companyId);
        return new Response(
          JSON.stringify({
            error: "No pitch deck found for this company",
            success: false,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters for download",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Downloading file from path: ${path}`);
    
    // Attempt to download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('vc-documents')
      .download(path);
    
    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      
      // Try alternate paths if the primary path fails
      const alternativePaths = [];
      
      // Try without userId prefix if it's included
      if (path.includes('/')) {
        const segments = path.split('/');
        const filename = segments[segments.length - 1];
        alternativePaths.push(filename);
      }
      
      // Try with just the user ID folder
      if (userId && path.includes('/')) {
        const filename = path.split('/').pop() || '';
        alternativePaths.push(`${userId}/${filename}`);
      }
      
      // Try in root folder
      if (path.includes('/')) {
        const filename = path.split('/').pop() || '';
        alternativePaths.push(filename);
      }
      
      // Try alternates
      for (const altPath of alternativePaths) {
        console.log(`Trying alternate path: ${altPath}`);
        
        const { data: altFileData, error: altDownloadError } = await supabase.storage
          .from('vc-documents')
          .download(altPath);
        
        if (!altDownloadError && altFileData) {
          console.log(`Alternate download successful from path: ${altPath}, file size: ${altFileData.size} bytes`);
          return new Response(
            altFileData,
            {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": altFileData.type || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${altPath.split('/').pop()}"`,
              },
            }
          );
        }
      }
      
      // List the vc-documents bucket contents to help with debugging
      console.log("Listing storage bucket contents to debug...");
      let listResult;
      
      if (userId) {
        const { data: userFolderContents, error: listError } = await supabase.storage
          .from('vc-documents')
          .list(userId);
        
        if (!listError && userFolderContents) {
          console.log(`Files in user folder ${userId}:`, JSON.stringify(userFolderContents));
          listResult = userFolderContents;
        } else {
          console.log("Error listing user folder or empty folder:", listError);
        }
      }
      
      // List root bucket
      const { data: rootContents, error: rootListError } = await supabase.storage
        .from('vc-documents')
        .list();
      
      if (!rootListError && rootContents) {
        console.log("Files in root folder:", JSON.stringify(rootContents));
      }
      
      return new Response(
        JSON.stringify({
          error: "Failed to download document",
          details: downloadError.message,
          path: path,
          availableFiles: listResult || [],
          success: false,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`Download successful, file size: ${fileData.size} bytes`);
    
    // Return the file
    return new Response(
      fileData,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": fileData.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${path.split('/').pop()}"`,
        },
      }
    );
  } catch (error) {
    console.error("Error handling download:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to process download request",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Function to handle document uploads
async function handleUpload(
  requestData: any, 
  supabase: any, 
  corsHeaders: any
): Promise<Response> {
  // Handle upload logic
  const { userId, filePath, documentType, fileBase64 } = requestData;
  
  if (!userId || !filePath || !fileBase64) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameters for upload",
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  try {
    // Convert base64 to Uint8Array for storage upload
    const base64Data = fileBase64.split(',')[1] || fileBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const fullPath = `${userId}/${filePath}`;
    console.log(`Uploading file to path: ${fullPath}`);
    
    const { data, error } = await supabase.storage
      .from('vc-documents')
      .upload(fullPath, bytes, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (error) {
      console.error("Error uploading file:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to upload document",
          details: error.message,
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // If this is a fund thesis, update the user's profile
    if (documentType === 'fund_thesis') {
      const { error: updateError } = await supabase
        .from('vc_profiles')
        .update({ fund_thesis_url: filePath })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Error updating VC profile:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        path: data?.path || fullPath,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error handling upload:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to process upload request",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Function to get a public URL for a document
async function handleGetUrl(
  requestData: any, 
  supabase: any, 
  corsHeaders: any
): Promise<Response> {
  const { userId, documentType } = requestData;
  
  if (!userId || !documentType) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameters for get_url",
        success: false,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  try {
    let path: string | null = null;
    
    // Find the document path
    if (documentType === 'fund_thesis') {
      const { data: vcProfileData } = await supabase
        .from('vc_profiles')
        .select('fund_thesis_url')
        .eq('id', userId)
        .single();
      
      if (vcProfileData?.fund_thesis_url) {
        path = `${userId}/${vcProfileData.fund_thesis_url}`;
      } else {
        // Try to find any fund thesis document in the user's folder
        const { data: folderData } = await supabase.storage
          .from('vc-documents')
          .list(userId);
        
        if (folderData && folderData.length > 0) {
          const pdfFiles = folderData.filter(file => 
            file.name.toLowerCase().endsWith('.pdf') && 
            (file.name.toLowerCase().includes('fund') || 
             file.name.toLowerCase().includes('thesis'))
          );
          
          if (pdfFiles.length > 0) {
            path = `${userId}/${pdfFiles[0].name}`;
          } else if (folderData.some(file => file.name.toLowerCase().endsWith('.pdf'))) {
            const firstPdf = folderData.find(file => file.name.toLowerCase().endsWith('.pdf'));
            if (firstPdf) {
              path = `${userId}/${firstPdf.name}`;
            }
          }
        }
      }
    }
    
    if (!path) {
      return new Response(
        JSON.stringify({
          error: "No document found",
          success: false,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Generate a signed URL for downloading the file
    const { data, error } = await supabase.storage
      .from('vc-documents')
      .createSignedUrl(path, 60 * 60); // 1 hour expiry
    
    if (error) {
      console.error("Error creating signed URL:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create signed URL",
          details: error.message,
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        url: data.signedUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error handling get_url:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to process get_url request",
        details: error instanceof Error ? error.message : String(error),
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
