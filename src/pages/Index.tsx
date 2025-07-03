
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, TrendingUp, Mail, Lock, LogIn, UserPlus } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
              alt="InvestorBase Logo" 
              className="h-16 w-auto drop-shadow-lg" 
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">Access your investment dashboard</p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <LogIn className="h-6 w-6 text-gold" />
              Authentication
            </CardTitle>
            <CardDescription className="text-slate-300">
              Select your user type and enter your credentials
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="userType" className="text-sm font-medium text-slate-200 flex items-center gap-2">
                {getUserTypeIcon(selectedUserType)}
                User Type
              </Label>
              <Select value={selectedUserType} onValueChange={handleUserTypeChange}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white focus:border-gold focus:ring-gold/20">
                  <SelectValue placeholder="Select your user type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="founder" className="text-white focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Founder
                    </div>
                  </SelectItem>
                  <SelectItem value="accelerator" className="text-white focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Accelerator & Incubator
                    </div>
                  </SelectItem>
                  <SelectItem value="vc" className="text-white focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Venture Capitalist
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auth Forms */}
            {selectedUserType === 'founder' ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                  <TabsTrigger 
                    value="signin" 
                    className="data-[state=active]:bg-gold data-[state=active]:text-slate-900 text-slate-300"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-gold data-[state=active]:text-slate-900 text-slate-300"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4 mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-200 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-gold to-yellow-500 hover:from-yellow-500 hover:to-gold text-slate-900 font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Sign In
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-slate-200 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="your@email.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-slate-200 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-gold to-yellow-500 hover:from-yellow-500 hover:to-gold text-slate-900 font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating account...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Create Account
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institutional-email" className="text-slate-200 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input 
                    id="institutional-email" 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institutional-password" className="text-slate-200 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input 
                    id="institutional-password" 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-gold focus:ring-gold/20"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-gold to-yellow-500 hover:from-yellow-500 hover:to-gold text-slate-900 font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </div>
                  )}
                </Button>
              </form>
            )}

            {/* Institutional Access Notice */}
            {selectedUserType !== 'founder' && (
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <p className="text-center text-sm text-slate-300 flex items-center justify-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Don't have an account? Please contact your administrator for access.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-500 text-sm">Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
