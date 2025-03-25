
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Mail, ExternalLink } from "lucide-react";

type EmailStatus = 'none' | 'pending' | 'approved';

interface InvestorPitchEmailProps {
  isSetupPage?: boolean;
}

export const InvestorPitchEmail = ({ isSetupPage = false }: InvestorPitchEmailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<EmailStatus>('none');
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEmailStatus();
    }
  }, [user]);

  const fetchEmailStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('investor_pitch_emails')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        if (data.email_address) {
          setStatus('approved');
          setEmail(data.email_address);
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('none');
      }
    } catch (error) {
      console.error("Error fetching email status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestEmail = async () => {
    if (!user) return;
    
    try {
      setIsRequesting(true);
      
      const { error } = await supabase
        .from('investor_pitch_emails')
        .insert({
          user_id: user.id,
          request_status: 'pending'
        });
        
      if (error) {
        throw error;
      }
      
      setStatus('pending');
      
      toast({
        title: "Request submitted",
        description: "Thank you for your request. Our team will get back to you shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Error submitting request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`w-full rounded-lg bg-secondary/10 p-4 ${isSetupPage ? 'opacity-50 filter blur-[1px] pointer-events-none' : ''}`}>
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-lg bg-secondary/10 p-4 ${isSetupPage ? 'opacity-50 filter blur-[1px] pointer-events-none' : ''}`}>
      {status === 'none' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Request your personalized InvestorBase Pitch Email to receive pitch decks directly from founders.
          </p>
          <Button 
            onClick={requestEmail} 
            disabled={isRequesting || isSetupPage}
            variant="default"
            className="w-full sm:w-auto"
          >
            {isRequesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Request Email
              </>
            )}
          </Button>
        </div>
      )}

      {status === 'pending' && (
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="bg-amber-100 text-amber-700 rounded-full p-1 mr-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <p className="text-sm font-medium">Verification in progress</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Thank you for your request. Our team is setting up your InvestorBase Pitch Email and will get back to you shortly.
          </p>
        </div>
      )}

      {status === 'approved' && email && (
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="bg-green-100 text-green-700 rounded-full p-1 mr-2">
              <CheckCircle className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">Email ready to use</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-background p-3 rounded-md break-all border border-border/10 flex-grow">
              <a 
                href={`mailto:${email}`}
                className="text-primary hover:underline flex items-start gap-2"
              >
                <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{email}</span>
              </a>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(email);
                toast({
                  title: "Email copied",
                  description: "The email address has been copied to clipboard",
                });
              }}
            >
              Copy
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this email with founders to receive pitch decks directly to your dashboard.
          </p>
        </div>
      )}
    </div>
  );
};
