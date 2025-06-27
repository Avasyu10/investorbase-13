
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import UserTypeSelection from "@/components/auth/UserTypeSelection";
import AuthForm from "@/components/auth/AuthForm";
import InstitutionalSignin from "@/components/auth/InstitutionalSignin";

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedUserType, setSelectedUserType] = useState<'founder' | 'accelerator' | 'vc' | null>(null);

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleUserTypeSelect = (userType: 'founder' | 'accelerator' | 'vc') => {
    setSelectedUserType(userType);
  };

  const handleBackToUserSelection = () => {
    setSelectedUserType(null);
  };

  // Show user type selection or appropriate auth form
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      {!selectedUserType ? (
        <UserTypeSelection onUserTypeSelect={handleUserTypeSelect} />
      ) : selectedUserType === 'founder' ? (
        <div className="max-w-md w-full space-y-6 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
              alt="InvestorBase Logo" 
              className="h-16 w-auto" 
            />
          </div>
          
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold">Founder Authentication</h1>
            <button 
              onClick={handleBackToUserSelection}
              className="text-sm text-primary hover:underline"
            >
              ← Back to user type selection
            </button>
          </div>
          
          <AuthForm />
        </div>
      ) : (
        <InstitutionalSignin 
          userType={selectedUserType}
          onBack={handleBackToUserSelection}
        />
      )}
    </div>
  );
};

export default Index;
