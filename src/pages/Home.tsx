
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Home = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to PitchDeck AI</h1>
        <p className="text-xl mb-8">
          AI-powered pitch deck analysis to help you create winning presentations
        </p>
        <div className="space-x-4">
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
