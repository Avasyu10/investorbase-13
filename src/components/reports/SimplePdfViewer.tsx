
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from '@/integrations/supabase/client';

interface SimplePdfViewerProps {
  reportId: string;
  companyName: string;
}

export function SimplePdfViewer({ reportId, companyName }: SimplePdfViewerProps) {
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
      
      // Get the report details
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('pdf_url, user_id')
        .eq('id', reportId)
        .single();
        
      if (reportError) throw reportError;
      if (!report?.pdf_url) throw new Error('No PDF file found for this report');
      
      console.log('Report found:', report);
      
      // Download the PDF from storage
      const bucketName = 'report-pdfs';
      const filePath = `${report.user_id || user.id}/${report.pdf_url}`;
      
      console.log(`Downloading from bucket: ${bucketName}, path: ${filePath}`);
      
      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError || !pdfBlob) {
        console.error('Download failed:', downloadError);
        throw new Error(`Failed to download PDF: ${downloadError?.message || 'File not found'}`);
      }
      
      console.log('PDF downloaded successfully, size:', pdfBlob.size);
      
      // Create blob URL for the PDF
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

    // Cleanup function
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId, user]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${companyName.replace(/[^a-z0-9]/gi, '_')}_pitch_deck.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pitch Deck
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading pitch deck...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pitch Deck
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
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
        </CardContent>
      </Card>
    );
  }

  if (!pdfUrl) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pitch Deck
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No pitch deck available</p>
            <Button variant="outline" size="sm" onClick={loadPdf}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pitch Deck
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height: '600px' }}>
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', borderRadius: '8px' }}
            title={`${companyName} Pitch Deck`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
