
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import UserTypeSelection from "@/components/auth/UserTypeSelection";
import InstitutionalWelcome from "@/components/auth/InstitutionalWelcome";
import { ArrowLeft } from "lucide-react";

type UserType = 'founder' | 'accelerator' | 'vc' | null;
type AppState = 'homepage' | 'user-selection' | 'auth-form' | 'institutional-welcome';

const Index = () => {
  const { user, isLoading, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [selectedUserType, setSelectedUserType] = useState<UserType>(null);
  const [appState, setAppState] = useState<AppState>('homepage');

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password, 'founder');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signUpWithEmail(email, password);
    
    if (success) {
      // Reset form fields
      setEmail("");
      setPassword("");
      // Switch to sign in tab 
      setActiveTab("signin");
    }
  };

  const handleUserTypeSelect = (userType: UserType) => {
    setSelectedUserType(userType);
    if (userType === 'accelerator' || userType === 'vc') {
      setAppState('institutional-welcome');
    } else {
      setAppState('auth-form');
    }
  };

  const handleBackToUserTypeSelection = () => {
    setSelectedUserType(null);
    setAppState('user-selection');
    // Reset form fields when going back
    setEmail("");
    setPassword("");
    setActiveTab("signin");
  };

  const handleBackToHomepage = () => {
    setAppState('homepage');
    setSelectedUserType(null);
    setEmail("");
    setPassword("");
    setActiveTab("signin");
  };

  const handleGetStarted = () => {
    setAppState('user-selection');
  };

  // Show homepage first
  if (appState === 'homepage') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl w-full space-y-8 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
              alt="InvestorBase Logo" 
              className="h-20 w-auto" 
            />
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight">Welcome to InvestorBase</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deal Flow, Reimagined. Connect founders with investors through intelligent pitch deck analysis and streamlined communication.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="text-lg px-8 py-6"
            >
              Get Started
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
              asChild
            >
              <Link to="/about">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show user type selection after clicking "Get Started"
  if (appState === 'user-selection') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-4xl w-full space-y-6 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={handleBackToHomepage}
            className="self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to homepage
          </Button>
          
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
              alt="InvestorBase Logo" 
              className="h-16 w-auto" 
            />
          </div>
          <UserTypeSelection onUserTypeSelect={handleUserTypeSelect} />
        </div>
      </div>
    );
  }

  // Show institutional welcome for accelerator/vc
  if (appState === 'institutional-welcome') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        <InstitutionalWelcome 
          userType={selectedUserType as 'accelerator' | 'vc'} 
          onBack={handleBackToUserTypeSelection}
        />
      </div>
    );
  }

  // Show founder signup/signin form
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={handleBackToUserTypeSelection}
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
        
        <h1 className="text-4xl font-bold tracking-tight">Welcome, Founder!</h1>
        
        <p className="text-xl text-muted-foreground mb-6">
          Deal Flow, Reimagined.
        </p>
        
        <Card className="w-full">
          <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your reports
                  </CardDescription>
                </CardHeader>
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
                  <div className="text-right">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
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
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Register to access investment reports
                  </CardDescription>
                </CardHeader>
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
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Index;
