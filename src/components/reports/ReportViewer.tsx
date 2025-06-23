
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getReportById } from "@/lib/supabase/reports";

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
      
      const report = await getReportById(reportId);
      
      if (!report.pdf_url) {
        throw new Error('No PDF file associated with this report');
      }
      
      // Download the PDF using the Supabase storage client directly
      const { supabase } = await import('@/integrations/supabase/client');
      
      const bucketName = 'report-pdfs';
      const filePath = `${report.user_id || user.id}/${report.pdf_url}`;
      
      console.log(`Downloading from bucket: ${bucketName}, path: ${filePath}`);
      
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError || !pdfBlob || pdfBlob.size === 0) {
        console.error('Download failed:', downloadError?.message || 'No data/empty file');
        throw new Error(`Failed to download PDF: ${downloadError?.message || 'File not found'}`);
      }
      
      console.log('PDF downloaded successfully:', {
        path: filePath,
        size: pdfBlob.size,
        type: pdfBlob.type
      });
      
      // Create blob URL
      const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
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
