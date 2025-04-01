
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export function EmailSecretCheck() {
  const [hasResendApiKey, setHasResendApiKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingKey, setSettingKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        setLoading(true);
        const { data: secrets, error } = await supabase.functions.listSecrets();
        
        if (error) {
          console.error('Error checking for RESEND_API_KEY:', error);
          return;
        }
        
        const hasKey = secrets?.some(secret => secret.name === 'RESEND_API_KEY');
        setHasResendApiKey(hasKey || false);
      } catch (error) {
        console.error('Error checking for Resend API key:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkApiKey();
  }, []);
  
  const handleSetApiKey = async () => {
    if (!apiKey) return;
    
    try {
      setSettingKey(true);
      const { error } = await supabase.functions.setSecret('RESEND_API_KEY', apiKey);
      
      if (error) {
        console.error('Error setting RESEND_API_KEY:', error);
        return;
      }
      
      setHasResendApiKey(true);
      setApiKey('');
    } catch (error) {
      console.error('Error setting Resend API key:', error);
    } finally {
      setSettingKey(false);
    }
  };
  
  if (loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking API key configuration...</AlertTitle>
      </Alert>
    );
  }
  
  if (hasResendApiKey === true) {
    return (
      <Alert className="bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle>Resend API Key is configured</AlertTitle>
        <AlertDescription>
          Your email confirmation system is ready to use.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Resend API Key is missing</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>
          The email confirmation system requires a Resend API key. Please sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> and create an API key.
        </p>
        
        <div className="flex items-center gap-2">
          <Input
            type="password"
            placeholder="Enter Resend API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button 
            onClick={handleSetApiKey}
            disabled={!apiKey || settingKey}
          >
            {settingKey ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : "Set Key"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
