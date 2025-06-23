
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { downloadReport } from "@/lib/supabase/reports";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Use a more reliable worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

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
        
        console.log('Starting PDF load for report:', reportId);
        
        // Get the report data
        const { data: report, error: reportError } = await supabase
          .from('reports')
          .select('pdf_url, user_id, is_public_submission')
          .eq('id', reportId)
          .single();

        if (reportError || !report) {
          console.error('Report fetch error:', reportError);
          throw new Error('Report not found');
        }

        console.log('Report found:', { 
          pdfUrl: report.pdf_url, 
          userId: report.user_id, 
          isPublic: report.is_public_submission 
        });

        if (!report.pdf_url) {
          throw new Error('No PDF URL found in report');
        }

        // Try multiple download strategies with better error handling
        let blob = null;
        const strategies = [];

        // Strategy 1: User-specific path for dashboard uploads
        if (report.user_id && !report.is_public_submission) {
          strategies.push({
            name: 'user-specific path',
            path: `${report.user_id}/${report.pdf_url}`,
            bucket: 'report_pdfs'
          });
        }

        // Strategy 2: Direct path
        strategies.push({
          name: 'direct path',
          path: report.pdf_url,
          bucket: 'report_pdfs'
        });

        // Strategy 3: Check email attachments bucket
        strategies.push({
          name: 'email attachments',
          path: report.pdf_url,
          bucket: 'email_attachments'
        });

        // Try each strategy
        for (const strategy of strategies) {
          if (blob) break;
          
          try {
            console.log(`Trying ${strategy.name}:`, strategy.path);
            
            const { data: storageData, error: storageError } = await supabase.storage
              .from(strategy.bucket)
              .download(strategy.path);
            
            if (!storageError && storageData) {
              blob = storageData;
              console.log(`Successfully downloaded via ${strategy.name}`);
              break;
            } else {
              console.log(`${strategy.name} failed:`, storageError?.message || 'No data');
            }
          } catch (err) {
            console.log(`${strategy.name} exception:`, err);
          }
        }

        // Strategy 4: Try public URL as last resort
        if (!blob) {
          try {
            console.log('Trying public URL access...');
            const { data: publicUrl } = supabase.storage
              .from('report_pdfs')
              .getPublicUrl(report.pdf_url);
            
            if (publicUrl.publicUrl) {
              console.log('Fetching from public URL:', publicUrl.publicUrl);
              const response = await fetch(publicUrl.publicUrl);
              
              if (response.ok) {
                blob = await response.blob();
                console.log('Downloaded via public URL successfully');
              } else {
                console.log('Public URL fetch failed:', response.status, response.statusText);
              }
            }
          } catch (err) {
            console.log('Public URL exception:', err);
          }
        }

        if (!blob) {
          throw new Error('Failed to download PDF from any storage location');
        }

        // Validate the blob
        console.log('PDF blob info:', {
          size: blob.size,
          type: blob.type
        });

        if (blob.size === 0) {
          throw new Error('Downloaded PDF file is empty');
        }

        // Create object URL
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        console.log('PDF URL created successfully');
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const onDocumentLoadError = (error: any) => {
    console.error('PDF document load error:', error);
    setError('Failed to load PDF document. The file may be corrupted or incompatible.');
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()} 
            className="mt-2"
          >
            Retry
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
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            className="max-w-full"
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
            }}
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
        )}
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
