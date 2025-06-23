
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { SimplePdfViewer } from "@/components/reports/SimplePdfViewer";

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
  
  console.log('SlideBySlideViewer props:', { reportId, slideNotesCount: slideNotes.length, companyName });

  // Get the current slide's notes
  const currentSlideNotes = slideNotes.find(slide => slide.slideNumber === currentSlide);
  
  // Get total number of slides (either from slide notes or assume a reasonable number)
  const totalSlides = slideNotes.length > 0 ? Math.max(...slideNotes.map(s => s.slideNumber)) : 10;

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

      {/* Split View: PDF on left, Notes on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Viewer - Left Side */}
        <div className="lg:col-span-1">
          <SimplePdfViewer reportId={reportId} companyName={companyName} />
        </div>

        {/* Slide Notes - Right Side */}
        <div className="lg:col-span-1">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Slide {currentSlide} Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
