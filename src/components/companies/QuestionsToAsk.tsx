
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Loader2, MessageSquare, ArrowRight } from "lucide-react";
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
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <HelpCircle className="h-6 w-6" />
            </div>
            Strategic Questions
          </CardTitle>
          <p className="text-blue-100 mt-2">
            Curated questions to help you evaluate this investment opportunity
          </p>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading strategic questions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-t-lg">
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-t-lg">
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
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No questions available</p>
              <p className="text-gray-500 text-sm mt-2">Questions for this company haven't been generated yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HelpCircle className="h-6 w-6" />
          </div>
          Strategic Questions
        </CardTitle>
        <p className="text-blue-100 mt-2">
          {questions.length} curated questions to help you evaluate this investment opportunity
        </p>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={index} className="group">
              <div className="flex gap-4 items-start p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium text-lg">
                    {question}
                  </p>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Pro Tip</span>
          </div>
          <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
            Use these questions during your due diligence process to gain deeper insights into the company's potential and risks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
