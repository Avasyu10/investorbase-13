
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function TestEmail() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email is required');
      return;
    }
    
    setIsLoading(true);
    console.log('Sending test email to:', email);
    
    try {
      // Call the edge function directly
      const response = await supabase.functions.invoke('barc_confirmation_email', {
        body: { 
          id: 'test-' + Date.now(),
          email,
          companyName,
          debug: true
        }
      });
      
      console.log('Function response:', response);
      
      if (response.error) {
        toast.error('Error sending email', {
          description: response.error.message || 'Unknown error occurred'
        });
        console.error('Error details:', response.error);
      } else {
        toast.success('Email sent successfully!', {
          description: 'Check your inbox for the test email'
        });
      }
    } catch (error: any) {
      console.error('Exception while calling function:', error);
      toast.error('Failed to call email function', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Test Email Function</h1>
          <p className="text-muted-foreground">
            This page tests the confirmation email edge function
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="companyName" className="block text-sm font-medium">
              Company Name (Optional)
            </label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : 'Send Test Email'}
          </Button>
        </form>
      </div>
    </div>
  );
}
