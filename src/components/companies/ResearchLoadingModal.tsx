
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ResearchLoadingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const researchQuotes = [
  "Gathering market insights from trusted sources...",
  "Analyzing industry trends and competitive landscape...",
  "Researching recent market developments...",
  "Compiling the latest news and data points...",
  "Identifying strategic opportunities in the market...",
  "Evaluating market size and growth projections...",
  "Synthesizing insights to provide actionable intelligence...",
  "Exploring emerging trends in your industry...",
  "Validating market assumptions with factual data...",
  "Creating a comprehensive research summary..."
];

export function ResearchLoadingModal({ isOpen, onClose }: ResearchLoadingModalProps) {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Cycle through quotes every few seconds
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset progress and quote when modal opens
    setProgress(0);
    setCurrentQuote(0);
    
    // Increment progress smoothly
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newValue = prev + 0.5;
        return newValue > 100 ? 100 : newValue;
      });
    }, 500);
    
    // Rotate quotes
    const quoteInterval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % researchQuotes.length);
    }, 4000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(quoteInterval);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Performing Real-Time Research</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary absolute" />
            <div className="text-xl font-semibold">{Math.round(progress)}%</div>
          </div>
          
          <div className="text-center space-y-3">
            <p className="text-muted-foreground animate-pulse">
              {researchQuotes[currentQuote]}
            </p>
            <p className="text-xs text-muted-foreground">
              This may take up to a minute to complete. Please don't close this window.
            </p>
          </div>
          
          <Progress value={progress} className="w-full h-2" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
