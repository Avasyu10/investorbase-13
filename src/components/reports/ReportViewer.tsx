import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getReportById } from "@/lib/supabase/reports";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker - use the local worker file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface ReportViewerProps {
  reportId: string;
  initialPage?: number;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
}

export function ReportViewer({ reportId, initialPage = 1, showControls = true, onPageChange }: ReportViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();

  // Update page number when initialPage changes
  useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage]);

  const loadPdf = async () => {
    if (!user || !reportId) {
      console.log('Missing user or reportId:', { user: !!user, reportId });
      setError('Authentication required to load PDF');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('=== REPORT VIEWER: Starting PDF load ===');
      console.log('Report ID:', reportId);
      console.log('User ID:', user.id);
      
      // Clean up previous blob URL
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl('');
      }
      
      // Get the report details first
      const report = await getReportById(reportId);
      console.log('Report fetched:', {
        id: report.id,
        title: report.title,
        pdf_url: report.pdf_url,
        user_id: report.user_id
      });
      
      if (!report.pdf_url) {
        throw new Error('No PDF file associated with this report');
      }
      
      // Download the PDF using the Supabase storage client directly
      const { supabase } = await import('@/integrations/supabase/client');
      
      // The correct file path based on the storage structure
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
      
      console.log('✅ PDF downloaded successfully:', {
        path: filePath,
        size: pdfBlob.size,
        type: pdfBlob.type
      });
      
      // Verify the blob is a valid PDF
      if (!pdfBlob.type.includes('pdf') && pdfBlob.type !== 'application/octet-stream') {
        console.warn('Downloaded file may not be a PDF:', pdfBlob.type);
      }
      
      // Create blob URL
      const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
      setPdfUrl(blobUrl);
      
      console.log('✅ PDF blob URL created:', blobUrl);
      
    } catch (err) {
      console.error('❌ Error loading PDF:', err);
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdf();

    // Cleanup function
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId, user]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(''); // Clear any previous errors
    console.log(`✅ PDF document loaded successfully with ${numPages} pages`);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('❌ PDF document load error:', error);
    
    // More specific error messages based on the error type
    let errorMessage = 'Failed to load PDF document. ';
    
    if (error?.message?.includes('Invalid PDF')) {
      errorMessage += 'The file appears to be corrupted or not a valid PDF.';
    } else if (error?.message?.includes('Loading aborted')) {
      errorMessage += 'PDF loading was interrupted. Please try again.';
    } else if (error?.message?.includes('Cannot read')) {
      errorMessage += 'Unable to read the PDF file. It may be password protected or corrupted.';
    } else {
      errorMessage += 'Please try refreshing the page or contact support if the problem persists.';
    }
    
    setError(errorMessage);
  };

  const changePage = (offset: number) => {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
      onPageChange?.(page);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const handleRetry = () => {
    console.log('🔄 Retrying PDF load...');
    loadPdf();
  };

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
          <div className="text-xs text-muted-foreground mb-4">
            <p>Report ID: {reportId}</p>
            <p>User ID: {user?.id}</p>
          </div>
          <div className="flex gap-2 justify-center mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()} 
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="mb-4">No PDF available</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try Loading Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {showControls && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={rotate}>
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Rendering PDF...</span>
            </div>
          }
          error={
            <div className="text-center p-8 text-red-500">
              <p>Failed to render PDF document</p>
              <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
                Retry
              </Button>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            }
            error={
              <div className="text-center p-4 text-red-500">
                Failed to render page {pageNumber}
              </div>
            }
          />
        </Document>
      </div>
      
      {!showControls && numPages > 1 && (
        <div className="flex justify-center p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(numPages, 10) }, (_, index) => (
              <Button
                key={index + 1}
                variant={pageNumber === index + 1 ? "default" : "ghost"}
                size="sm"
                onClick={() => goToPage(index + 1)}
                className="w-8 h-8 p-0 text-xs"
              >
                {index + 1}
              </Button>
            ))}
            {numPages > 10 && <span className="text-xs text-muted-foreground">...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
