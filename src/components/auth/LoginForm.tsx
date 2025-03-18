
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  redirectTo?: string;
}

const LoginForm = ({ redirectTo = '/dashboard' }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use either the provided redirectTo prop or get it from the location state
  const from = redirectTo || location.state?.from || '/dashboard';
  
  // Check if user is already logged in initially
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log("User already logged in, redirecting to:", from);
          navigate(from, { replace: true });
        }
      } catch (err) {
        console.error("Error in auth check:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, [from, navigate]);

  // Redirect if user state changes
  useEffect(() => {
    if (user) {
      console.log("User detected in state, redirecting to:", from);
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log("Logging in, will redirect to:", from);
      await signInWithEmail(email, password);
      
      // Let's manually navigate after successful login to ensure we go to the right place
      // We use replace to avoid adding to the history stack
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      // The toast is already shown in signInWithEmail
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Log In</CardTitle>
        <CardDescription>Enter your email and password to log in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {/* <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link> */}
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col">
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
