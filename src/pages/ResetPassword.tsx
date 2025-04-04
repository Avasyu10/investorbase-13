
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { updatePassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if we have a session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      try {
        // The auth session check is now handled in the useAuth hook
        // We just need to check if there's an error in the URL
        const queryParams = new URLSearchParams(window.location.search);
        const errorParam = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');
        
        if (errorParam) {
          setError(errorDescription || "Invalid or expired password reset link. Please request a new one.");
          toast({
            title: "Reset link error",
            description: errorDescription || "Invalid or expired reset link",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError("Could not validate reset session. Please request a new password reset link.");
      }
    };

    checkSession();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const updated = await updatePassword(password);
      
      if (updated) {
        setSuccess(true);
        toast({
          title: "Password updated",
          description: "Your password has been updated successfully.",
        });
        
        // Navigate to home page after a short delay
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try resetting your password again.");
      toast({
        title: "Password update failed",
        description: err.message || "Failed to update password",
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
                <CardTitle>Set New Password</CardTitle>
              </div>
              <CardDescription>
                Create a new password for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success ? (
                <Alert>
                  <AlertDescription>
                    Password updated successfully! You'll be redirected to the login page.
                  </AlertDescription>
                </Alert>
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}
            </CardContent>
            {!success && (
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
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
