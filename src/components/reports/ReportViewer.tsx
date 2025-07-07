
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ReportViewerProps {
  reportId: string;
  initialPage?: number;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();

  const loadPdf = async () => {
    if (!user || !reportId) {
      setError('Authentication required to load PDF');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading PDF for report:', reportId);
      
      // Get the report data directly from reports table
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (reportError) {
        console.error("Report fetch error:", reportError);
        throw new Error(`Report not found: ${reportError.message}`);
      }
      
      if (!report) {
        throw new Error("Report not found");
      }
      
      console.log("Report found:", {
        id: report.id,
        title: report.title,
        pdfUrl: report.pdf_url,
        hasDescription: !!report.description,
        descriptionLength: report.description?.length || 0,
        isPublicSubmission: report.is_public_submission,
        userId: report.user_id
      });
      
      // Get the PDF file from storage
      if (!report.pdf_url) {
        throw new Error("No PDF URL found in report");
      }
      
      console.log("Attempting to download PDF from storage");
      
      // Use the correct bucket name consistently
      const bucketName = 'report-pdfs';
      
      // Try different path strategies based on report type
      let pdfData = null;
      
      // Strategy 1: Try direct path first
      console.log(`Downloading PDF: ${report.pdf_url} from bucket: ${bucketName}`);
      
      const { data, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(report.pdf_url);
        
      if (!downloadError && data) {
        pdfData = data;
        console.log(`Successfully downloaded PDF, size: ${data.size}`);
      } else {
        console.log(`Direct download failed: ${downloadError?.message}`);
        
        // Strategy 2: Try with user-specific path if we have a user_id
        if (report.user_id && !report.is_public_submission) {
          const userSpecificPath = `${report.user_id}/${report.pdf_url}`;
          console.log(`Trying user-specific path: ${userSpecificPath}`);
          
          const { data: userData, error: userError } = await supabase.storage
            .from(bucketName)
            .download(userSpecificPath);
            
          if (!userError && userData) {
            pdfData = userData;
            console.log(`Successfully downloaded via user-specific path, size: ${userData.size}`);
          } else {
            console.log(`User-specific path failed: ${userError?.message || 'No data'}`);
          }
        }
      }
      
      if (!pdfData) {
        throw new Error(`Failed to download PDF from storage. Bucket: ${bucketName}, Path: ${report.pdf_url}`);
      }
      
      console.log("PDF downloaded successfully, size:", pdfData.size);
      
      // Create blob URL
      const blobUrl = URL.createObjectURL(new Blob([pdfData], { type: 'application/pdf' }));
      setPdfUrl(blobUrl);
      
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdf();

    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-3">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-500">
        <div className="text-center mb-6">
          <p className="mb-2 text-lg font-semibold">PDF Loading Failed</p>
          <p className="mb-4 text-sm max-w-md">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadPdf}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="mb-4">No PDF available</p>
          <Button variant="outline" size="sm" onClick={loadPdf}>
            Try Loading Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          style={{ minHeight: '600px', border: 'none', borderRadius: '8px' }}
          title="PDF Report"
        />
      </div>
    </div>
  );
}
