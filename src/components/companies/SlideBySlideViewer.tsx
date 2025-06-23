
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare } from "lucide-react";
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
  console.log('SlideBySlideViewer props:', { reportId, slideNotesCount: slideNotes.length, companyName });

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Pitch Deck & Slide Analysis
      </h2>
      
      {/* PDF Viewer */}
      <SimplePdfViewer reportId={reportId} companyName={companyName} />
      
      {/* Slide Notes */}
      {slideNotes && slideNotes.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Slide-by-Slide Notes
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {slideNotes.map((slide) => (
              <Card key={slide.slideNumber} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1">
                      Slide {slide.slideNumber}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {slide.notes.map((note, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {note}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Slide Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Slide Notes Available</h3>
              <p className="text-muted-foreground">
                Slide-by-slide analysis notes are not available for this pitch deck yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
