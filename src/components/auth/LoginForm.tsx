
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInWithEmail, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await signInWithEmail(email, password);
  };

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden transition-all duration-300 transform shadow-lg animate-fade-in">
      <div className="flex justify-center mb-4">
        <img 
          src="/lovable-uploads/d45dee4c-b5ef-4833-b6a4-eaaa1b7e0c9a.png" 
          alt="InvestorBase Logo" 
          className="h-16 w-auto" 
        />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-center mb-2">InvestorBase</h1>
      
      <p className="text-xl text-muted-foreground mb-6 text-center">
        Deal Flow, Reimagined.
      </p>
      
      <div className="bg-[#121621] rounded-lg border border-[#2A2F3F]">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#161A29] rounded-t-lg">
            <TabsTrigger value="signin" className="rounded-tl-lg py-3">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-tr-lg py-3">
              <Link to="/signup" className="w-full h-full flex items-center justify-center">
                Sign Up
              </Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Sign In</h2>
              <p className="text-muted-foreground">
                Enter your credentials to access your reports
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-foreground font-medium">Email</label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#232736] border-[#2A2F3F] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-foreground font-medium">Password</label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[#232736] border-[#2A2F3F] h-12"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-[#F2B14B] hover:bg-[#E6A43F] text-[#121621] font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : "Sign In"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LoginForm;
