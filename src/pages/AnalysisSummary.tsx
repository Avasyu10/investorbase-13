
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AnalysisSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const companyId = location.state?.companyId || '';
  
  useEffect(() => {
    if (!companyId) {
      navigate('/dashboard');
    }
  }, [companyId, navigate]);

  const viewResults = () => {
    navigate(`/companies/${companyId}`);
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Card className="rounded-lg border shadow-md">
        <CardHeader className="bg-green-50 border-b">
          <CardTitle className="text-center text-green-700">
            Analysis Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Your Pitch Deck Analysis is Ready!</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We've analyzed your pitch deck and prepared a detailed assessment. Your results include
              an overall score, section-by-section analysis, strengths, weaknesses, and specific
              recommendations to improve your pitch.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button onClick={viewResults} size="lg" className="px-8">
              View Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
