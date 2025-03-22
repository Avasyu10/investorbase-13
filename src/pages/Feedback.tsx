
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Feedback = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { state: { from: '/feedback' } });
    }
  }, [user, isLoading, navigate]);

  const handleBackClick = () => {
    navigate(-1); // Navigate to the previous page in history
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 transition-colors" 
        onClick={handleBackClick}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Feedback Shapes InvestorBase</h1>
        <p className="text-muted-foreground mt-2">
          Every feature on InvestorBase exists because of valuable feedback we received from users like you. 
          Your insights drive our innovation and help us build a better platform for everyone.
        </p>
      </div>
      
      <FeedbackForm />
    </div>
  );
};

export default Feedback;
