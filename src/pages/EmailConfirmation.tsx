
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader, Mail, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const EmailConfirmation = () => {
  const { user, isLoading } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const email = localStorage.getItem('pendingConfirmationEmail') || '';

  // Check confirmation status periodically
  useEffect(() => {
    let intervalId: number;
    
    if (email && !user?.email_confirmed_at) {
      intervalId = window.setInterval(async () => {
        setIsCheckingStatus(true);
        
        try {
          const { data } = await supabase.auth.getUser();
          
          if (data?.user?.email_confirmed_at) {
            // Email is confirmed
            toast({
              title: "Email confirmed",
              description: "Your email has been confirmed successfully!",
            });
            
            // Clear interval and redirect to profile setup
            clearInterval(intervalId);
            navigate('/profile/setup');
          }
        } catch (error) {
          console.error("Error checking confirmation status:", error);
        } finally {
          setIsCheckingStatus(false);
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [email, user, toast, navigate]);

  // Redirect if user is already confirmed
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate('/profile/setup');
    }
  }, [user, navigate]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Email address not found. Please sign up again.');
      return;
    }

    try {
      setIsResending(true);
      setError(null);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) throw error;
      
      setResendSuccess(true);
      toast({
        title: "Confirmation email resent",
        description: "Please check your inbox for the confirmation link",
      });
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email');
      toast({
        title: "Error",
        description: err.message || 'Failed to resend confirmation email',
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCancelSignup = async () => {
    localStorage.removeItem('pendingConfirmationEmail');
    
    if (user) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
    
    navigate('/signup');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg">
          <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg animate-fade-in">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Waiting for Email Confirmation</CardTitle>
          <CardDescription>
            Please check your email inbox and click the confirmation link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <div className="bg-muted p-4 rounded-md flex items-center space-x-3">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                Confirmation email sent to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="flex items-center justify-center rounded-full bg-primary/10 p-4 w-16 h-16">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center font-medium">Waiting for email confirmation...</p>
            <p className="text-center text-sm text-muted-foreground">
              The page will automatically redirect once your email is confirmed
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">What happens next?</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Click the link in the email we sent you</li>
                  <li>Once confirmed, you'll be automatically redirected</li>
                  <li>Complete your profile setup</li>
                </ul>
              </div>
            </div>
          </div>

          {resendSuccess && (
            <Alert className="bg-success/10 border-success text-success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Confirmation email resent successfully
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleResendConfirmation} 
            disabled={isResending} 
            className="w-full"
            variant="outline"
          >
            {isResending ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Resending...</span>
              </div>
            ) : (
              "Resend confirmation email"
            )}
          </Button>
          
          <Button 
            onClick={handleCancelSignup} 
            variant="destructive"
            className="w-full"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel signup
          </Button>
          
          <div className="text-center text-sm pt-2">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
