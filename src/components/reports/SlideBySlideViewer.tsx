
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SlideNote {
  slideNumber: number;
  slideTitle: string;
  notes: string[];
}

interface SlideBySlideViewerProps {
  pdfUrl: string;
  slideNotes: SlideNote[];
}

export const SlideBySlideViewer = ({ pdfUrl, slideNotes }: SlideBySlideViewerProps) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  
  const currentSlideNotes = slideNotes.find(slide => slide.slideNumber === currentSlide);
  const totalSlides = slideNotes.length;

  const handlePrevious = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNext = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[800px]">
      {/* PDF Viewer Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pitch Deck</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentSlide === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide} / {totalSlides}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentSlide === totalSlides}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden">
          <iframe
            src={`${pdfUrl}#page=${currentSlide}`}
            className="w-full h-full"
            title="Pitch Deck PDF"
          />
        </div>
      </div>

      {/* Notes Section */}
      <div className="flex flex-col">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">
              Slide {currentSlide}: {currentSlideNotes?.slideTitle || 'Analysis Notes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSlideNotes?.notes.map((note, index) => (
              <div key={index} className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {note}
                  </p>
                </div>
              </div>
            ))}
            
            {!currentSlideNotes && (
              <div className="text-center text-muted-foreground py-8">
                <p>No analysis notes available for this slide.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
