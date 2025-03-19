import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// This is just a placeholder component - the actual ProfileSetup component is imported from another file
// We're just adding a verification check before allowing access to it
const ProfileSetupForm = () => {
  // Profile setup form implementation...
  return <div>Profile Setup Form</div>;
};

const ProfileSetup = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If authentication is done loading and there's no user, redirect to login
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  // Check if the email is confirmed
  if (!isLoading && user && !user.email_confirmed_at) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Email Verification Required</CardTitle>
            <CardDescription>
              Please complete the signup process before accessing this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <Alert className="bg-amber-50 border-amber-200">
              <Mail className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-700">
                We've sent a confirmation link to your email address. Please click on the link to verify your account.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground">
                You need to confirm your email address before you can access your profile. Check your inbox and spam folder for the confirmation email.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="default" 
              className="w-full" 
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If still loading or email is confirmed, show the actual profile setup form
  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
          <p>Loading...</p>
        </div>
      ) : (
        <ProfileSetupForm />
      )}
    </div>
  );
};

export default ProfileSetup;
