
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Building, TrendingUp, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface InstitutionalSigninProps {
  userType: 'accelerator' | 'vc';
  onBack: () => void;
}

const InstitutionalSignin = ({ userType, onBack }: InstitutionalSigninProps) => {
  const { signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password, userType);
  };

  const config = {
    accelerator: {
      title: 'Welcome, Accelerator/Incubator',
      description: 'Sign in to access your startup evaluation tools and portfolio management features.',
      icon: <Building className="h-12 w-12 text-green-600" />
    },
    vc: {
      title: 'Welcome, Venture Capitalist',
      description: 'Sign in to access your deal flow management and startup analysis platform.',
      icon: <TrendingUp className="h-12 w-12 text-purple-600" />
    }
  };

  return (
    <div className="max-w-md w-full space-y-6 animate-fade-in">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="self-start"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to user type selection
      </Button>
      
      <div className="flex justify-center mb-4">
        <img 
          src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
          alt="InvestorBase Logo" 
          className="h-16 w-auto" 
        />
      </div>
      
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {config[userType].icon}
          </div>
          <CardTitle className="text-2xl">{config[userType].title}</CardTitle>
          <CardDescription className="text-center">
            {config[userType].description}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSignIn}>
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
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <span className="loader"></span>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account? Please contact your administrator for access.
      </p>
    </div>
  );
};

export default InstitutionalSignin;
