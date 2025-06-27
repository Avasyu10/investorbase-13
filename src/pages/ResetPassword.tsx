
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
    const checkResetSession = async () => {
      try {
        setIsChecking(true);
        console.log("Current URL:", window.location.href);
        console.log("Location hash:", location.hash);
        
        // Check if we have hash fragments (tokens from the email link)
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log("Hash params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        // If we have reset tokens in the URL, this is from an email link
        if (accessToken && type === 'recovery') {
          console.log("Found password reset tokens in URL");
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error("Error setting session from tokens:", error);
            setError("Invalid or expired password reset link. Please request a new one.");
            setIsValidSession(false);
          } else if (data.session && data.user) {
            console.log("Successfully set session from reset tokens");
            setIsValidSession(true);
            setError("");
          } else {
            console.log("No session established from tokens");
            setError("Invalid or expired password reset link. Please request a new one.");
            setIsValidSession(false);
          }
        } else {
          // Check for existing session (in case user already went through the token exchange)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Session error:", error);
            setError("Invalid or expired password reset link. Please request a new one.");
            setIsValidSession(false);
          } else if (session && session.user) {
            console.log("Found existing valid session");
            setIsValidSession(true);
            setError("");
          } else {
            console.log("No valid session found");
            setError("Invalid or expired password reset link. Please request a new one.");
            setIsValidSession(false);
          }
        }
      } catch (err) {
        console.error("Error checking reset session:", err);
        setError("An error occurred. Please try again.");
        setIsValidSession(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkResetSession();
  }, [location.hash]);

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
      
      const { error } = await supabase.auth.updateUser({ 
        password 
      });
      
      if (error) {
        throw error;
      }
      
      setMessage("Password updated successfully!");
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      
      // Navigate to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      console.error("Password reset error:", err);
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
                <p>Verifying reset link...</p>
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
                {error ? "There was an issue with your password reset link" : "Create a new password for your account"}
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
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
