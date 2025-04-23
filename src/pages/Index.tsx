
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

// Investors/Angels callouts for left side
const POINTS = [
  "✓ Streamline your sourcing.",
  "✓ Accelerate your diligence.",
  "✓ Eliminate the noise.",
];

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
    <div
      className="min-h-screen flex items-stretch justify-center bg-background relative"
      style={{ overflowX: "hidden" }}
    >
      {/* Left side: Brand, Headline, Points */}
      <div className="flex flex-col justify-between py-16 px-6 md:px-16 w-full md:w-1/2 max-w-2xl">
        {/* Top: Logo and Contact (logo left, contact right on large screens) */}
        <div className="flex items-center justify-between mb-8">
          <img
            src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png"
            alt="InvestorBase Logo"
            className="h-14 md:h-16 w-auto"
            style={{ objectFit: 'contain' }}
          />
          <a
            href="mailto:support@investorbase.com"
            className="hidden md:inline-block px-6 py-2 rounded-md font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow transition"
          >
            Contact
          </a>
        </div>
        {/* Headline Block */}
        <div className="my-auto">
          <div className="uppercase tracking-widest text-sm md:text-base font-bold mb-2 text-muted-foreground">
            Smart Investing
          </div>
          <h1 className="text-3xl md:text-5xl font-bold md:leading-tight mb-4 text-left">
            The Edge Every Investor Needs—<br className="hidden md:block"/><span className="text-primary"> s</span>
          </h1>
          <ul className="space-y-3 mb-4 text-base md:text-lg text-left">
            {POINTS.map((point, i) => (
              <li key={i} className="flex items-center gap-2">
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Footer: copyright etc. on small screens only */}
        <div className="block md:hidden text-sm text-muted-foreground text-center mt-12">
          © {new Date().getFullYear()} InvestorBase. All rights reserved.
        </div>
      </div>
      {/* Right side: Auth Card */}
      <div className="flex items-center justify-center w-full md:w-1/2 bg-muted/40">
        <div className="w-full max-w-md px-4 md:px-0 py-10 md:py-0">
          <Card className="w-full shadow-xl rounded-2xl">
            <Tabs defaultValue="signin" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 my-6 mx-auto max-w-xs rounded-full">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn}>
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xl font-semibold mb-1">Investor Login</CardTitle>
                    <CardDescription>
                      Access exclusive reports, research and your deal tracker.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
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
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
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
                  <CardHeader className="pb-0">
                    <CardTitle className="text-xl font-semibold mb-1">Create Investor Account</CardTitle>
                    <CardDescription>
                      Register to access investor research and startup analysis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
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
                        autoComplete="new-password"
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
          {/* Copyright on desktop */}
          <div className="hidden md:block text-xs text-muted-foreground text-center mt-10">
            © {new Date().getFullYear()} InvestorBase. All rights reserved.
          </div>
        </div>
      </div>
      {/* Contact button for mobile only, floating to top right */}
      <a
        href="mailto:support@investorbase.com"
        className="md:hidden fixed top-4 right-4 z-20 px-5 py-2 rounded-md font-semibold bg-primary text-primary-foreground shadow transition"
      >
        Contact
      </a>
    </div>
  );
};

export default Index;
