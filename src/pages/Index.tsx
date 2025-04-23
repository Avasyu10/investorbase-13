
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Briefcase, TrendingUp } from "lucide-react";

const Index = () => {
  const { user, isLoading, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
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
    await signInWithEmail(email, password);
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center bg-background">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        {/* Logo and Investment Theme */}
        <div className="flex flex-col items-center mb-4">
          <img 
            src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
            alt="InvestorBase Logo" 
            className="h-16 w-auto mb-2"
          />
          <div className="flex items-center gap-2 text-gold-foreground">
            <Briefcase className="h-6 w-6 text-primary -mt-0.5" />
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight mb-0">
          Welcome to InvestorBase
        </h1>

        <div className="mx-auto w-24 h-1 bg-primary rounded-full my-2 mb-4" />

        <p className="text-lg text-muted-foreground mb-8 font-medium">
          Your Gateway to Curated Startups and Premium Deal Flow
        </p>

        {/* Why InvestorBase section for credibility */}
        <div className="bg-card border shadow-subtle rounded-lg px-5 py-4 mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
            Why InvestorBase?
          </h2>
          <ul className="text-left text-muted-foreground text-sm space-y-1 pl-1">
            <li>• Exclusive access to vetted startups, founders, and pitch materials</li>
            <li>• In-depth reporting powered by AI, tailored for angels and VCs</li>
            <li>• Streamlined due diligence workflow to accelerate your investments</li>
            <li>• All data secure, private, and built for serious investors</li>
          </ul>
        </div>

        {/* Sign In / Up Card */}
        <Card className="w-full border-0 drop-shadow-lg glass">
          <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-1">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" /> Investor Sign In
                  </CardTitle>
                  <CardDescription>
                    Access your premium reports and personalized deal flow
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
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-primary" /> Create Investor Account
                  </CardTitle>
                  <CardDescription>
                    Register for access to curated startup data and insights
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

        <div className="mt-6 text-xs text-muted-foreground">
          InvestorBase is an invite-only platform for accredited investors, angel syndicates, and venture partners.<br />
          <span className="font-medium">Serious about high-quality deal flow? This is your new home.</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
