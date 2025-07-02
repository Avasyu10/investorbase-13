
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface QuestionsToAskProps {
  companyId: string;
  companyName: string;
}

interface BitsAnalysisResult {
  questions?: string[];
  [key: string]: any;
}

export function QuestionsToAsk({ companyId, companyName }: QuestionsToAskProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query bitsanalysis table for questions related to this company
        const { data, error: fetchError } = await supabase
          .from('bitsanalysis')
          .select('analysis_result')
          .ilike('deck_name', `%${companyName}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching questions:', fetchError);
          setError('Failed to load questions');
          return;
        }

        if (data?.analysis_result) {
          const analysisResult = data.analysis_result as BitsAnalysisResult;
          if (analysisResult.questions && Array.isArray(analysisResult.questions)) {
            setQuestions(analysisResult.questions);
          } else {
            setQuestions([]);
          }
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error in fetchQuestions:', err);
        setError('Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };

    if (companyName) {
      fetchQuestions();
    }
  }, [companyId, companyName]);

  if (isLoading) {
    return (
      <Card className="mb-8 shadow-card border-0">
        <CardContent className="pt-5">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8 shadow-card border-0">
        <CardContent className="pt-5">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="mb-8 shadow-card border-0">
        <CardContent className="pt-5">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No questions available for this company.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 shadow-card border-0">
      <CardContent className="pt-5">
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
                {index + 1}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {question}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
