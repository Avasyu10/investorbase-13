
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SlideNote {
  slideNumber: number;
  notes: string[];
}

interface SlideBySlideViewerProps {
  reportId: string;
  slideNotes: SlideNote[];
  companyName: string;
}

export function SlideBySlideViewer({ reportId, slideNotes, companyName }: SlideBySlideViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  console.log('SlideBySlideViewer props:', { reportId, slideNotesCount: slideNotes.length, companyName });

  // Get the current slide's notes
  const currentSlideNotes = slideNotes.find(slide => slide.slideNumber === currentSlide);
  
  // Get total number of slides (either from slide notes or assume a reasonable number)
  const totalSlides = slideNotes.length > 0 ? Math.max(...slideNotes.map(s => s.slideNumber)) : 10;

  // Load PDF when component mounts
  React.useEffect(() => {
    const loadPdf = async () => {
      if (!reportId) {
        setError('No report ID provided');
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
        const filePath = `${report.user_id}/${report.pdf_url}`;
        
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

    loadPdf();

    // Cleanup function
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [reportId]);

  const goToNextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Generate PDF URL with page parameter and view settings to hide scrollbars
  const getPdfUrlWithPage = () => {
    if (!pdfUrl) return '';
    return `${pdfUrl}#page=${currentSlide}&view=FitH&scrollbar=0&toolbar=0&navpanes=0`;
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Pitch Deck & Slide Analysis
      </h2>
      
      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevSlide}
            disabled={currentSlide <= 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <Badge variant="secondary" className="px-3 py-1">
            Slide {currentSlide} of {totalSlides}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextSlide}
            disabled={currentSlide >= totalSlides}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Split View: PDF on left (more space), Notes on right (less space) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Viewer - Left Side (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pitch Deck - Slide {currentSlide}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3">Loading pitch deck...</span>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{error}</p>
                </div>
              )}
              
              {!loading && !error && pdfUrl && (
                <div className="w-full overflow-hidden" style={{ height: '600px' }}>
                  <iframe
                    key={currentSlide} // Force re-render when slide changes
                    src={getPdfUrlWithPage()}
                    width="100%"
                    height="100%"
                    style={{ 
                      border: 'none', 
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                    scrolling="no"
                    title={`${companyName} Pitch Deck - Slide ${currentSlide}`}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Slide Notes - Right Side (1/3 width, same height as PDF) */}
        <div className="lg:col-span-1">
          <Card className="border-l-4 border-l-primary h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Slide {currentSlide} Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-full overflow-y-auto" style={{ maxHeight: '550px' }}>
                {currentSlideNotes && currentSlideNotes.notes.length > 0 ? (
                  <div className="space-y-3">
                    {currentSlideNotes.notes.map((note, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {note}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Notes for This Slide</h3>
                    <p className="text-muted-foreground">
                      There are no analysis notes available for slide {currentSlide}.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Navigation to Slides with Notes */}
      {slideNotes && slideNotes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {slideNotes.map((slide) => (
                <Button
                  key={slide.slideNumber}
                  variant={currentSlide === slide.slideNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentSlide(slide.slideNumber)}
                  className="min-w-[60px]"
                >
                  Slide {slide.slideNumber}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Click on any slide number to jump directly to that slide and view its notes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
