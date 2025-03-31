
import { useState, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, SendHorizontal, Mic, BarChart2 } from "lucide-react";

interface SplitViewProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  maxScore?: number;
}

export function SplitView({ isOpen, onClose, score, maxScore = 5 }: SplitViewProps) {
  const [message, setMessage] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Format score to one decimal place
  const formattedScore = typeof score === 'number' ? score.toFixed(1) : '0.0';

  // Handle layout adjustments when split view is opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-screen"
      >
        {/* Main content panel */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full overflow-auto p-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute top-4 left-4 z-10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="pt-12 px-4">
              {/* Original content will go here */}
              <div className="max-w-3xl mx-auto">
                <Card className="shadow-card border-0 mb-6 bg-gradient-to-br from-secondary/30 via-secondary/20 to-background">
                  <CardHeader className="border-b pb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl font-semibold">Overall Assessment</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold text-emerald-400">{formattedScore}</span>
                        <span className="text-sm text-muted-foreground">/{maxScore}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-5">
                    <div className="h-[300px] flex items-center justify-center">
                      <p className="text-muted-foreground">Original content view</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ResizablePanel>
        
        {/* Resizable handle */}
        <ResizableHandle withHandle />
        
        {/* AI Assistant panel */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col border-l">
            <div className="p-4 border-b bg-muted/30">
              <h2 className="text-lg font-semibold">AI Assistant</h2>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {/* Sample conversation */}
                <div className="bg-muted/50 p-3 rounded-lg ml-auto max-w-[80%]">
                  <p className="text-sm">
                    This is a simulated AI chat interface for design purposes. You would see your conversations with the AI assistant here.
                  </p>
                </div>
                
                <div className="bg-primary/10 p-3 rounded-lg mr-auto max-w-[80%]">
                  <p className="text-sm">
                    I can help you analyze this company's performance, compare metrics, or provide additional insights about their business model.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Input area */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-muted-foreground" />
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Consult with AI..."
                    className="w-full px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button size="icon" variant="ghost" className="text-primary" disabled={!message}>
                  <SendHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
