import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
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

      // Extract hash from URL if present
      const hash = location.hash;
      let accessToken = '';
      
      if (hash) {
        // The hash typically looks like #access_token=xxx&type=recovery
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token') || '';
      }

      let result;
      
      if (accessToken) {
        // If we have an access token from the URL, use it directly
        result = await supabase.auth.updateUser({ 
          password: password 
        }, {
          accessToken: accessToken
        });
      } else {
        // Otherwise, rely on an existing session (less likely to work for password reset)
        result = await supabase.auth.updateUser({ password });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      setMessage("Password updated successfully!");
      
      // Navigate to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to update password. Please try resetting your password again.");
    } finally {
      setLoading(false);
    }
  };

  // When component mounts, check if we have the access token in the URL
  useEffect(() => {
    const checkResetToken = () => {
      const hash = location.hash;
      if (hash && hash.includes('access_token')) {
        console.log("Found access token in URL for password reset");
      } else {
        console.log("No access token found in URL for password reset");
      }
    };

    checkResetToken();
  }, [location]);

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
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
              {message && (
                <p className="text-sm font-medium text-green-600">{message}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
