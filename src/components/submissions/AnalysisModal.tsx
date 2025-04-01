
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";

interface PublicSubmission {
  id: string;
  title: string;
  description: string | null;
  company_stage: string | null;
  industry: string | null;
  website_url: string | null;
  created_at: string;
  form_slug: string;
  pdf_url: string | null;
  report_id: string | null;
}

interface AnalysisModalProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  submission: PublicSubmission | null;
  onClose: () => void;
  analysisText?: string;
}

export function AnalysisModal({ 
  isOpen, 
  isAnalyzing, 
  submission, 
  onClose, 
  analysisText 
}: AnalysisModalProps) {
  const [expandedSections, setExpandedSections] = useState<{
    summary: boolean;
    similarities: boolean;
    differences: boolean;
  }>({
    summary: true,
    similarities: true,
    differences: true,
  });

  // Ensure sections are always expanded when the modal opens
  useEffect(() => {
    if (isOpen) {
      setExpandedSections({
        summary: true,
        similarities: true,
        differences: true,
      });
    }
  }, [isOpen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Parse the analysis text into sections
  const parseAnalysis = (text: string) => {
    if (!text) return { summary: [], similarities: [], differences: [], score: "0.0" };
    
    const sections: { 
      summary: string[];
      similarities: string[];
      differences: string[];
      score: string;
    } = {
      summary: [],
      similarities: [],
      differences: [],
      score: "0.0"
    };
    
    // First try to extract the score with improved regex patterns that capture more variations
    // Look for both "Synergy Score: X.X/5" and "**Synergy Score:** X.X/5" formats
    const scorePatterns = [
      /\*\*Synergy Score:\*\*\s*(\d+\.\d+)\/5/i,
      /Synergy Score:\s*(\d+\.\d+)\/5/i,
      /score of (\d+\.\d+)\/5/i,
      /Synergy Score: (\d+\.\d+)/i,
      /alignment (?:rating|score).*?(\d+\.\d+)\/5/i,
      /(\d+\.\d+)\/5 alignment/i,
      /rated .*?(\d+\.\d+)\/5/i
    ];
    
    // Try each pattern until one matches
    for (const pattern of scorePatterns) {
      const scoreMatch = text.match(pattern);
      if (scoreMatch && scoreMatch[1]) {
        sections.score = scoreMatch[1];
        break;
      }
    }
    
    let currentSection = '';
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.match(/^(\*\*)?1\.\s*Overall\s*Summary(\*\*)?/i) || 
          line.includes('Overall Summary')) {
        currentSection = 'summary';
        continue;
      } else if (line.match(/^(\*\*)?2\.\s*Key\s*Similarities(\*\*)?/i) || 
                line.includes('Key Similarities')) {
        currentSection = 'similarities';
        continue;
      } else if (line.match(/^(\*\*)?3\.\s*Key\s*Differences(\*\*)?/i) || 
                line.includes('Key Differences')) {
        currentSection = 'differences';
        continue;
      }
      
      // Skip section headers, score line, or empty lines
      if (line.match(/^\*\*.*\*\*$/) || 
          line.match(/\*\*Synergy Score:\*\*/) || 
          !line.trim() || 
          line.match(/^\d+\.$/) || 
          line === '---') {
        continue;
      }
      
      // Process bullet points for similarities and differences
      if ((currentSection === 'similarities' || currentSection === 'differences') && 
          (line.startsWith('*') || line.startsWith('-'))) {
        // Clean bullet points and formatting
        let cleanedLine = line.replace(/^[\*\-]\s*/, '').trim();
        cleanedLine = cleanedLine.replace(/^\*\*|\*\*$/g, '').trim();
        
        if (cleanedLine) {
          sections[currentSection as 'similarities' | 'differences'].push(cleanedLine);
        }
        continue;
      }
      
      // Add content to current section
      if (currentSection && sections[currentSection as keyof typeof sections]) {
        if (currentSection === 'summary') {
          // Clean formatting
          let cleanedLine = line.replace(/^\*\*|\*\*$/g, '').trim();
          
          if (cleanedLine && !cleanedLine.match(/^Synergy Score:/i)) {
            sections.summary.push(cleanedLine);
          }
        }
      }
    }
    
    return sections;
  };

  const parsedAnalysis = analysisText ? parseAnalysis(analysisText) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Fund Thesis Alignment Analysis
          </DialogTitle>
          <DialogDescription>
            {submission?.title 
              ? `Analysis of "${submission.title}" against your fund thesis`
              : "Fund Thesis Analysis"}
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-center text-sm text-muted-foreground">
              This may take a minute or two. Please don't close this window.
            </p>
          </div>
        ) : parsedAnalysis ? (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {/* Summary Section */}
            <div className="border rounded-lg overflow-hidden">
              <button 
                onClick={() => toggleSection('summary')}
                className="w-full flex items-center justify-between bg-muted/50 p-4 text-left font-medium"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <h3 className="text-lg font-semibold">Overall Summary</h3>
                </div>
                {expandedSections.summary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedSections.summary && (
                <div className="p-4 space-y-3 bg-white">
                  <div className="mb-4">
                    <span className="font-semibold text-primary">Synergy Score: </span>
                    <span className="text-lg font-bold text-primary">{parsedAnalysis.score}/5</span>
                  </div>
                  {parsedAnalysis.summary.length > 0 ? (
                    parsedAnalysis.summary.map((point, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                        {point}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No summary information available</p>
                  )}
                </div>
              )}
            </div>

            {/* Similarities Section */}
            <div className="border rounded-lg overflow-hidden">
              <button 
                onClick={() => toggleSection('similarities')}
                className="w-full flex items-center justify-between bg-muted/50 p-4 text-left font-medium"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-green-100 text-green-700">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <h3 className="text-lg font-semibold">Key Similarities</h3>
                </div>
                {expandedSections.similarities ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedSections.similarities && (
                <div className="p-4 space-y-2 bg-white">
                  {parsedAnalysis.similarities.length > 0 ? (
                    parsedAnalysis.similarities.map((point, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{point}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No similarities identified</p>
                  )}
                </div>
              )}
            </div>

            {/* Differences Section */}
            <div className="border rounded-lg overflow-hidden">
              <button 
                onClick={() => toggleSection('differences')}
                className="w-full flex items-center justify-between bg-muted/50 p-4 text-left font-medium"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <h3 className="text-lg font-semibold">Key Differences</h3>
                </div>
                {expandedSections.differences ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedSections.differences && (
                <div className="p-4 space-y-2 bg-white">
                  {parsedAnalysis.differences.length > 0 ? (
                    parsedAnalysis.differences.map((point, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{point}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No differences identified</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-center">No analysis available.</p>
            {!analysisText && (
              <p className="text-sm text-muted-foreground mt-2">Please try again or contact support if the issue persists.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
