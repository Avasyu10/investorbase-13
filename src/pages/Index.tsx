import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, TrendingUp, Eye, EyeOff } from "lucide-react";
const Index = () => {
  const {
    user,
    isLoading,
    signInWithEmail,
    signUpWithEmail
  } = useAuth();
  const navigate = useNavigate();
  // Changed default state to an empty string to enforce selection
  const [selectedUserType, setSelectedUserType] = useState<'' | 'founder' | 'accelerator' | 'vc'>('');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType) {
      alert("Please select a user type.");
      return;
    }
    await signInWithEmail(email, password, selectedUserType);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType) {
      alert("Please select a user type.");
      return;
    }
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
        return null;
      // Return null when no user type is selected
    }
  };

  // Determine if buttons should be disabled
  const isAuthDisabled = isLoading || !selectedUserType;
  return <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
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
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Select your user type and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prominent User Type Selection */}
            <div className="space-y-3">
              
              <Select value={selectedUserType} onValueChange={handleUserTypeChange}>
                <SelectTrigger className="w-full h-12 text-base border-2 border-primary/50 bg-background/80 hover:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    {getUserTypeIcon(selectedUserType)}
                    {/* Changed placeholder text */}
                    <SelectValue placeholder="Select your User Type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background border-primary/20">
                  <SelectItem value="founder" className="text-base py-3">
                    <span>Founder</span>
                  </SelectItem>
                  <SelectItem value="accelerator" className="text-base py-3">
                    <span>Accelerator & Incubator</span>
                  </SelectItem>
                  <SelectItem value="vc" className="text-base py-3">
                    <span>Investor</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20" />
              </div>
              
            </div>

            {/* Authentication Forms */}
            {selectedUserType === 'founder' ? <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2 text-left"> {/* Added text-left */}
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2 text-left"> {/* Added text-left */}
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isAuthDisabled}>
                      {isLoading ? <div className="flex items-center space-x-2">
                          <span className="loader"></span>
                          <span>Signing in...</span>
                        </div> : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2 text-left"> {/* Added text-left */}
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2 text-left"> {/* Added text-left */}
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isAuthDisabled}>
                      {isLoading ? <div className="flex items-center space-x-2">
                          <span className="loader"></span>
                          <span>Creating account...</span>
                        </div> : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs> : <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2 text-left"> {/* Added text-left */}
                  <Label htmlFor="institutional-email">Email</Label>
                  <Input id="institutional-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2 text-left"> {/* Added text-left */}
                  <Label htmlFor="institutional-password">Password</Label>
                  <div className="relative">
                    <Input id="institutional-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isAuthDisabled}>
                  {isLoading ? <div className="flex items-center space-x-2">
                      <span className="loader"></span>
                      <span>Signing in...</span>
                    </div> : "Sign In"}
                </Button>
              </form>}

            {selectedUserType !== 'founder' && <p className="text-center text-sm text-muted-foreground mt-4">
                Don't have an account? Please contact your administrator for access.
              </p>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Index;
