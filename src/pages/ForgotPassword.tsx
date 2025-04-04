
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await resetPassword(email);
      
      if (success) {
        setIsSubmitted(true);
        toast({
          title: "Reset link sent",
          description: "Check your email for the password reset link.",
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset failed",
        description: "There was a problem sending the reset link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <Card className="w-full">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex items-center mb-2">
                <Link to="/" className="text-muted-foreground hover:text-foreground mr-2">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <CardTitle>Reset Password</CardTitle>
              </div>
              <CardDescription>
                {isSubmitted 
                  ? "Check your email for a password reset link."
                  : "Enter your email to receive a password reset link."}
              </CardDescription>
            </CardHeader>
            {!isSubmitted ? (
              <>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </CardFooter>
              </>
            ) : (
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    We've sent a password reset link to <strong>{email}</strong>. 
                    Please check your inbox and follow the instructions.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full mt-4"
                  onClick={() => navigate("/")}
                >
                  Back to Sign In
                </Button>
              </CardContent>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
