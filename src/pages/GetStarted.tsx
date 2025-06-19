
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UserTypeSelection from "@/components/auth/UserTypeSelection";
import InstitutionalWelcome from "@/components/auth/InstitutionalWelcome";
import AuthForm from "@/components/auth/AuthForm";

type UserType = 'founder' | 'accelerator' | 'vc' | null;
type FlowState = 'user-selection' | 'auth-form' | 'institutional-welcome';

const GetStarted = () => {
  const navigate = useNavigate();
  const [selectedUserType, setSelectedUserType] = useState<UserType>(null);
  const [flowState, setFlowState] = useState<FlowState>('user-selection');

  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedUserType(userType);
    if (userType === 'accelerator' || userType === 'vc') {
      setFlowState('institutional-welcome');
    } else {
      setFlowState('auth-form');
    }
  };

  const handleBackToUserTypeSelection = () => {
    setSelectedUserType(null);
    setFlowState('user-selection');
  };

  const handleBackToHomepage = () => {
    navigate('/');
  };

  // Show user type selection by default
  if (flowState === 'user-selection') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl w-full space-y-6 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={handleBackToHomepage}
            className="self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to homepage
          </Button>
          
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
              alt="InvestorBase Logo" 
              className="h-16 w-auto" 
            />
          </div>
          <UserTypeSelection onUserTypeSelect={handleUserTypeSelect} />
        </div>
      </div>
    );
  }

  // Show institutional welcome for accelerator/vc
  if (flowState === 'institutional-welcome') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <InstitutionalWelcome 
          userType={selectedUserType as 'accelerator' | 'vc'} 
          onBack={handleBackToUserTypeSelection}
        />
      </div>
    );
  }

  // Show founder auth form
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={handleBackToUserTypeSelection}
          className="self-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to user type selection
        </Button>
        
        <div className="flex justify-center mb-4">
          <img 
            src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
            alt="InvestorBase Logo" 
            className="h-16 w-auto" 
          />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Welcome, Founder!</h1>
        
        <p className="text-xl text-muted-foreground mb-6">
          Deal Flow, Reimagined.
        </p>
        
        <AuthForm />
      </div>
    </div>
  );
};

export default GetStarted;
