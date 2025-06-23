
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { downloadReport } from "@/lib/supabase/reports";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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

  useEffect(() => {
    const loadPdf = async () => {
      if (!user || !reportId) return;
      
      try {
        setLoading(true);
        setError('');
        
        // First get the report to find the PDF URL
        const { data: report, error: reportError } = await supabase
          .from('reports')
          .select('pdf_url, user_id')
          .eq('id', reportId)
          .single();

        if (reportError || !report) {
          throw new Error('Report not found');
        }

        console.log('Loading PDF for report:', { reportId, pdfUrl: report.pdf_url, reportUserId: report.user_id });

        // Try to download the PDF - handle both user-specific and public paths
        let blob;
        try {
          // Try user-specific path first
          blob = await downloadReport(report.pdf_url, report.user_id || user.id);
        } catch (userError) {
          console.log('User-specific download failed, trying public path:', userError);
          
          // If user-specific fails, try public path or direct path
          try {
            const { data: pdfData, error: downloadError } = await supabase.storage
              .from('report_pdfs')
              .download(report.pdf_url);
            
            if (downloadError || !pdfData) {
              throw downloadError || new Error('Failed to download PDF');
            }
            
            blob = pdfData;
          } catch (publicError) {
            console.error('Both download methods failed:', publicError);
            throw new Error('Failed to load PDF document');
          }
        }

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        console.log('PDF loaded successfully');
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    // Cleanup URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId, user]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log(`PDF loaded with ${numPages} pages`);
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
      <div className="flex items-center justify-center h-96 text-red-500">
        <div className="text-center">
          <p className="mb-2">{error}</p>
          <p className="text-sm text-muted-foreground">
            Report ID: {reportId}
          </p>
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
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => {
            console.error('PDF load error:', error);
            setError('Failed to load PDF document');
          }}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
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
