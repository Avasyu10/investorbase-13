import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Loader2, MessageSquare } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
interface QuestionsToAskProps {
  companyId: string;
  companyName: string;
}
interface BitsAnalysisResult {
  questions?: string[];
  [key: string]: any;
}
interface BitsAnalysis {
  id: string;
  analysis_result: BitsAnalysisResult | null;
}
export function QuestionsToAsk({
  companyId,
  companyName
}: QuestionsToAskProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query bitsanalysis table for questions related to this company
        const {
          data,
          error: fetchError
        } = await supabase.from('bitsanalysis').select('analysis_result').ilike('deck_name', `%${companyName}%`).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        if (fetchError) {
          console.error('Error fetching questions:', fetchError);
          setError('Failed to load questions');
          return;
        }
        const analysisResult = data?.analysis_result as BitsAnalysisResult | null;
        if (analysisResult?.questions && Array.isArray(analysisResult.questions)) {
          setQuestions(analysisResult.questions);
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
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {companyName}
            </h1>
            <p className="text-lg text-muted-foreground">
              Strategic Questions for Due Diligence
            </p>
          </div>

          <Card className="shadow-lg border border-border bg-card">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <HelpCircle className="h-6 w-6" />
                </div>
                Strategic Questions
              </CardTitle>
              <p className="text-slate-200 mt-2">
                Curated questions to help you evaluate this investment opportunity
              </p>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading strategic questions...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {companyName}
            </h1>
            <p className="text-lg text-muted-foreground">
              Strategic Questions for Due Diligence
            </p>
          </div>

          <Card className="shadow-lg border border-border bg-card">
            <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <HelpCircle className="h-6 w-6" />
                </div>
                Strategic Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                  <p className="text-muted-foreground text-sm mt-2">Please try refreshing the page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (questions.length === 0) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {companyName}
            </h1>
            <p className="text-lg text-muted-foreground">
              Strategic Questions for Due Diligence
            </p>
          </div>

          <Card className="shadow-lg border border-border bg-card">
            <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <HelpCircle className="h-6 w-6" />
                </div>
                Strategic Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-foreground font-medium">No questions available</p>
                  <p className="text-muted-foreground text-sm mt-2">Questions for this company haven't been generated yet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {companyName}
          </h1>
          <p className="text-lg text-muted-foreground">
            Strategic Questions for Due Diligence
          </p>
        </div>

        <Card className="shadow-lg border border-border bg-card">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <HelpCircle className="h-6 w-6" />
              </div>
              Strategic Questions
            </CardTitle>
            <p className="text-slate-200 mt-2">
              {questions.length} curated questions to help you evaluate this investment opportunity
            </p>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <div className="space-y-6">
              {questions.map((question, index) => <div key={index} className="group">
                  <div className="flex gap-4 items-start p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="leading-relaxed font-medium text-lg text-neutral-950">
                        {question}
                      </p>
                    </div>
                  </div>
                </div>)}
            </div>
            
            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Pro Tip</span>
              </div>
              <p className="text-sm mt-1 text-gray-950">
                Use these questions during your due diligence process to gain deeper insights into the company's potential and risks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}