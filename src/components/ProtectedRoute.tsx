
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a user but no valid session (token expired)
    if (user && !session) {
      console.log('User exists but session is invalid, signing out...');
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "default",
      });
    }
  }, [user, session, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Require both user and valid session
  if (!user || !session) {
    return <Navigate to="/" replace state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
