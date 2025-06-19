
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Show homepage
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
            alt="InvestorBase Logo" 
            className="h-20 w-auto" 
          />
        </div>
        
        <div className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">Welcome to InvestorBase</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deal Flow, Reimagined. Connect founders with investors through intelligent pitch deck analysis and streamlined communication.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg"
            className="text-lg px-8 py-6"
            asChild
          >
            <Link to="/get-started">
              Get Started
            </Link>
          </Button>
          <Button 
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6"
            asChild
          >
            <Link to="/about">
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
