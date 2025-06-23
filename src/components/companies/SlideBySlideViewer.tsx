
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, BookOpen, Target, TrendingUp, AlertCircle } from "lucide-react";
import { ReportViewer } from "@/components/reports/ReportViewer";

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
  const [totalSlides, setTotalSlides] = useState(slideNotes.length);

  // Update total slides when slideNotes change
  useEffect(() => {
    if (slideNotes && slideNotes.length > 0) {
      const maxSlideNumber = Math.max(...slideNotes.map(note => note.slideNumber));
      setTotalSlides(maxSlideNumber);
      
      // If current slide is beyond available slides, reset to first slide
      if (currentSlide > maxSlideNumber) {
        setCurrentSlide(1);
      }
    }
  }, [slideNotes, currentSlide]);

  const currentSlideNotes = slideNotes.find(slide => slide.slideNumber === currentSlide);

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

  const goToSlide = (slideNumber: number) => {
    if (slideNumber >= 1 && slideNumber <= totalSlides) {
      setCurrentSlide(slideNumber);
    }
  };

  const getInsightIcon = (noteIndex: number) => {
    // Cycle through different icons for visual variety
    const icons = [
      <Target className="h-4 w-4 text-blue-500" />,
      <TrendingUp className="h-4 w-4 text-emerald-500" />,
      <AlertCircle className="h-4 w-4 text-amber-500" />,
      <FileText className="h-4 w-4 text-violet-500" />,
      <BookOpen className="h-4 w-4 text-rose-500" />
    ];
    return icons[noteIndex % icons.length];
  };

  if (!slideNotes || slideNotes.length === 0) {
    return (
      <Card className="shadow-card border-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold mb-2">No Slide Notes Available</h3>
          <p className="text-muted-foreground">
            No detailed slide-by-slide notes are available for this presentation. The analysis may still be processing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Slide by Slide Analysis</h2>
          <span className="text-sm text-muted-foreground">({companyName})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevSlide}
            disabled={currentSlide === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="px-3 py-1 bg-primary/10 rounded-md text-sm font-medium">
            Slide {currentSlide} of {totalSlides}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextSlide}
            disabled={currentSlide === totalSlides}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content area with PDF and notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        {/* PDF Viewer - Left Side */}
        <Card className="shadow-card border-0 bg-gradient-to-br from-secondary/20 via-secondary/10 to-background overflow-hidden">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Presentation Deck - Slide {currentSlide}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-full">
            <div className="h-[500px]">
              <ReportViewer 
                reportId={reportId} 
                initialPage={currentSlide}
                showControls={false}
                onPageChange={(page) => setCurrentSlide(page)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes - Right Side */}
        <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Slide {currentSlide} Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 h-full overflow-y-auto max-h-[500px]">
            {currentSlideNotes ? (
              <div className="space-y-4">
                {currentSlideNotes.notes.map((note, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/20 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {getInsightIcon(index)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-foreground">
                        {note}
                      </p>
                    </div>
                  </div>
                ))}
                
                {currentSlideNotes.notes.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No notes available for this slide.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No analysis available for slide {currentSlide}.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  The AI analysis may not have covered this slide, or the slide might be blank.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slide navigation indicators */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg max-w-full overflow-x-auto">
          {Array.from({ length: Math.min(totalSlides, 15) }, (_, index) => (
            <Button
              key={index + 1}
              variant={currentSlide === index + 1 ? "default" : "ghost"}
              size="sm"
              onClick={() => goToSlide(index + 1)}
              className="w-8 h-8 p-0 text-xs shrink-0"
            >
              {index + 1}
            </Button>
          ))}
          {totalSlides > 15 && (
            <span className="text-xs text-muted-foreground px-2">
              ...{totalSlides}
            </span>
          )}
        </div>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
          Debug: Current slide: {currentSlide}, Total slides: {totalSlides}, Available notes: {slideNotes.map(n => n.slideNumber).join(', ')}
        </div>
      )}
    </div>
  );
}
