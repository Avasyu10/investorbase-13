
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setError("Invalid or expired password reset link. Please request a new one.");
          return;
        }
        
        if (data.session) {
          console.log("Valid session found for password reset");
          setIsValidSession(true);
        } else {
          console.log("No active session found for password reset");
          setError("Invalid or expired password reset link. Please request a new one.");
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError("An error occurred. Please try again.");
      }
    };

    checkSession();
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
      
      // Update the password using the Supabase client
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

  if (!isValidSession && !error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <Card className="w-full">
            <CardContent className="p-6">
              <div className="text-center">
                <p>Loading...</p>
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
