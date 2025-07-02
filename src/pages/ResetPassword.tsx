
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        setIsChecking(true);
        console.log("Current URL:", window.location.href);
        
        // Get the full URL including hash
        const fullUrl = window.location.href;
        console.log("Full URL:", fullUrl);
        
        // Check if URL contains recovery tokens
        if (fullUrl.includes('access_token') && fullUrl.includes('type=recovery')) {
          console.log("Recovery URL detected, attempting to handle auth change");
          
          // Let Supabase handle the auth change automatically
          // The onAuthStateChange in useAuth should pick this up
          
          // Wait a moment for the auth state to update
          setTimeout(async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log("Session after URL processing:", { session: !!session, error });
            
            if (error) {
              console.error("Session error:", error);
              setError("Invalid or expired password reset link. Please request a new one.");
              setIsValidSession(false);
            } else if (session) {
              console.log("Valid session found for password reset");
              setIsValidSession(true);
              setError("");
            } else {
              console.log("No session found");
              setError("Invalid password reset link. Please request a new password reset.");
              setIsValidSession(false);
            }
            setIsChecking(false);
          }, 1000);
          
        } else {
          console.log("No recovery tokens in URL, checking existing session");
          
          // Check if there's already a valid session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error("Error getting session:", sessionError);
            setError("Invalid password reset link. Please request a new password reset.");
            setIsValidSession(false);
          } else if (session) {
            console.log("User already has valid session");
            setIsValidSession(true);
            setError("");
          } else {
            setError("Invalid password reset link. Please request a new password reset.");
            setIsValidSession(false);
          }
          setIsChecking(false);
        }
      } catch (err) {
        console.error("Error handling password reset:", err);
        setError("An error occurred while validating the reset link.");
        setIsValidSession(false);
        setIsChecking(false);
      }
    };

    handlePasswordReset();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    if (!isValidSession) {
      setError("Invalid session. Please request a new password reset link.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });
      
      if (error) {
        throw error;
      }
      
      setMessage("Password updated successfully! Redirecting to sign in...");
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. Please sign in with your new password.",
      });
      
      // Sign out the user and redirect to home after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/");
      }, 2000);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
      
      toast({
        title: "Password update failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-center">
                <p>Validating password reset link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <CardTitle>Set New Password</CardTitle>
              </div>
              <CardDescription>
                {error && !isValidSession ? "There was an issue with your password reset link" : "Create a new password for your account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && !isValidSession ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-destructive">{error}</p>
                  <Link to="/forgot-password">
                    <Button type="button" className="w-full">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Enter your new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Confirm your new password"
                    />
                  </div>
                  {error && (
                    <p className="text-sm font-medium text-destructive">{error}</p>
                  )}
                  {message && (
                    <p className="text-sm font-medium text-green-600">{message}</p>
                  )}
                </>
              )}
            </CardContent>
            {isValidSession && (
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !password || !confirmPassword}
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </Button>
              </CardFooter>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
