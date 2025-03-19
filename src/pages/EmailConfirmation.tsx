
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EmailConfirmation = () => {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const email = localStorage.getItem('pendingConfirmationEmail') || '';

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

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg animate-fade-in">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Confirm Your Email</CardTitle>
          <CardDescription>
            Please check your email inbox to confirm your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {email && (
            <p className="text-muted-foreground">
              We've sent a confirmation link to <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
          
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">What happens next?</p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Click the link in the email we sent you</li>
                  <li>Once confirmed, you'll be able to sign in</li>
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
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            onClick={handleResendConfirmation} 
            disabled={isResending} 
            className="w-full"
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
          
          <div className="text-center text-sm">
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
