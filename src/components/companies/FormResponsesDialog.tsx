import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FormResponsesDialogProps {
  companyId: string;
}

interface EurekaSubmission {
  question_3: string | null;
  question_4: string | null;
  question_5: string | null;
  question_6: string | null;
  question_7: string | null;
  question_8: string | null;

  company_name: string;
  submitter_email: string; // This field will still be fetched but not displayed
  created_at: string;
}

const FormResponsesDialog = ({ companyId }: FormResponsesDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [submission, setSubmission] = useState<EurekaSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFormResponses = async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('eureka_form_submissions')
        .select('question_3, question_4, question_5, question_6, question_7, question_8, company_name, submitter_email, created_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching form responses:', error);
        toast({
          title: "Error",
          description: "Failed to fetch form responses",
          variant: "destructive"
        });
        return;
      }

      setSubmission(data);
    } catch (error) {
      console.error('Error fetching form responses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form responses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFormResponses();
    }
  }, [isOpen, companyId]);

  const questions = [
    "What problem is your venture targeting to solve? How are the affected people (customers/consumers) coping with the problem at present?", // Mapped to question_3
    "What is the intended customer segment or target customers of your venture?", // Mapped to question_4
    "Who are your current competitors? (Please mention both direct and indirect competitors if applicable)", // Mapped to question_5
    "How will your venture generate revenue? What are the factors affecting your costs and revenues? Also highlight any growth opportunities in future.", // Mapped to question_6
    "How does your idea and marketing strategy differentiate your startup from your competitors and help you create demand for your product/service? Mention your IP (Intellectual Property) advantage if any.", // Mapped to question_7
    "Explain your prototype", // Mapped to question_8
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          View Form Responses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Eureka Form Responses
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : submission ? (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{submission.company_name}</h3>
                {/* Removed "Submitted by: {submission.submitter_email}" as requested */}
                <p className="text-sm text-muted-foreground">
                  Date: {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
              
              {questions.map((question, index) => {
                // Internal mapping to Supabase columns (question_3, question_4, etc.)
                const supabaseQuestionNumber = index + 3; 
                const responseKey = `question_${supabaseQuestionNumber}` as keyof EurekaSubmission;
                
                // Displayed question number (Q1, Q2, Q3, etc.)
                const displayQuestionNumber = index + 1;

                if (!(responseKey in submission)) {
                    console.warn(`Warning: '${String(responseKey)}' not found in submission data.`);
                    return null; 
                }

                const response = submission[responseKey];
                
                return (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h4 className="font-medium text-foreground mb-2">
                      Q{displayQuestionNumber}: {question} {/* Changed from Q{questionNumber} to Q{displayQuestionNumber} */}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {response || "No response provided"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-lg mb-2">No Form Responses Found</h3> {/* Adjusted text size for consistency */}
              <p className="text-muted-foreground">
                This company doesn't have any associated Eureka form responses.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormResponsesDialog;
