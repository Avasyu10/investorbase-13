
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  redirectTo?: string;
}

const LoginForm = ({ redirectTo = '/dashboard' }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, user } = useAuth();
  
  // Get the intended destination from props or location state
  const from = redirectTo || location.state?.from || '/dashboard';

  // Check if the user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          return;
        }
        
        if (data.session) {
          console.log("User already logged in, redirecting to:", from);
          navigate(from);
        }
      } catch (err) {
        console.error("Error in auth check:", err);
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, [navigate, from]);

  // If user is already logged in, redirect to the intended destination
  useEffect(() => {
    if (user) {
      console.log("User detected in state, redirecting to:", from);
      navigate(from);
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signInWithEmail(email, password);
      // The redirect will be handled by the auth state change effect
    } catch (error: any) {
      console.error("Login error:", error);
      // The toast is already shown in signInWithEmail
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state before auth check completes
  if (!authChecked) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden transition-all duration-300 transform shadow-lg animate-fade-in">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Checking authentication...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden transition-all duration-300 transform shadow-lg animate-fade-in">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full transition-all duration-200 hover:shadow-md" 
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <span>Sign in</span>
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
