
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, TrendingUp } from "lucide-react";

const Index = () => {
  const {
    user,
    isLoading,
    signInWithEmail,
    signUpWithEmail
  } = useAuth();
  const navigate = useNavigate();
  const [selectedUserType, setSelectedUserType] = useState<'founder' | 'accelerator' | 'vc'>('founder');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password, selectedUserType);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signUpWithEmail(email, password);
    if (success) {
      setEmail("");
      setPassword("");
      setActiveTab("signin");
    }
  };

  const handleUserTypeChange = (userType: 'founder' | 'accelerator' | 'vc') => {
    setSelectedUserType(userType);
    if (userType === 'accelerator' || userType === 'vc') {
      setActiveTab("signin");
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'founder':
        return <User className="h-4 w-4" />;
      case 'accelerator':
        return <Building2 className="h-4 w-4" />;
      case 'vc':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        <div className="flex justify-center mb-6">
          <img src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" alt="InvestorBase Logo" className="h-16 w-auto" />
        </div>
        
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-4xl font-bold tracking-tight">Login/Signup</h1>
          <p className="text-xl text-muted-foreground">
            Please sign in or create an account to continue
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Select your user type and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prominent User Type Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <Label htmlFor="userType" className="text-base font-semibold text-primary">
                  Step 1: Select Your User Type
                </Label>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
              <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5 backdrop-blur-sm">
                <Select value={selectedUserType} onValueChange={handleUserTypeChange}>
                  <SelectTrigger className="w-full h-12 text-base border-2 border-primary/50 bg-background/80 hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      {getUserTypeIcon(selectedUserType)}
                      <SelectValue placeholder="Choose your role..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    <SelectItem value="founder" className="text-base py-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4" />
                        <span>Founder</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="accelerator" className="text-base py-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4" />
                        <span>Accelerator & Incubator</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="vc" className="text-base py-3">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-4 w-4" />
                        <span>Venture Capitalist</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Step 2: Authentication</span>
              </div>
            </div>

            {/* Authentication Forms */}
            {selectedUserType === 'founder' ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
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
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
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
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institutional-email">Email</Label>
                  <Input
                    id="institutional-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institutional-password">Password</Label>
                  <Input
                    id="institutional-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
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
              </form>
            )}

            {selectedUserType !== 'founder' && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Don't have an account? Please contact your administrator for access.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
