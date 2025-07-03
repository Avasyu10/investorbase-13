import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      // Reset form fields
      setEmail("");
      setPassword("");
      // Switch to sign in tab 
      setActiveTab("signin");
    }
  };
  const handleUserTypeChange = (userType: 'founder' | 'accelerator' | 'vc') => {
    setSelectedUserType(userType);
    // If user selects accelerator or VC, switch to signin tab
    if (userType === 'accelerator' || userType === 'vc') {
      setActiveTab("signin");
    }
  };
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
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Select your user type and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userType">User Type</Label>
              <Select value={selectedUserType} onValueChange={handleUserTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="founder">Founder</SelectItem>
                  <SelectItem value="accelerator">Accelerator & Incubator</SelectItem>
                  <SelectItem value="vc">Venture Capitalist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedUserType === 'founder' ? <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <div className="flex items-center space-x-2">
                          <span className="loader"></span>
                          <span>Signing in...</span>
                        </div> : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <div className="flex items-center space-x-2">
                          <span className="loader"></span>
                          <span>Creating account...</span>
                        </div> : "Sign Up"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs> : <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institutional-email">Email</Label>
                  <Input id="institutional-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institutional-password">Password</Label>
                  <Input id="institutional-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
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