
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, metadata?: Record<string, string>) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialSession = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have a hash fragment in the URL (from email confirmation)
        const hasAccessToken = window.location.hash.includes('access_token=');
        const hasType = window.location.hash.includes('type=signup') || window.location.hash.includes('type=recovery');
        
        // If this is a callback from email confirmation
        if (hasAccessToken && hasType) {
          console.log('Detected auth callback in URL');
          // Let Supabase handle the URL params
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error handling auth callback:', error);
            throw error;
          }
          
          if (data?.session) {
            console.log('Session established from URL callback');
            setSession(data.session);
            setUser(data.session.user);
            
            // Clear the hash fragment after processing
            window.location.hash = '';
            
            // If this was a signup confirmation, clear the pending confirmation
            localStorage.removeItem('pendingConfirmationEmail');
            
            // Only redirect if we're on the email confirmation page
            if (location.pathname === '/email-confirmation') {
              navigate('/profile/setup');
              toast({
                title: "Email confirmed",
                description: "Your email has been confirmed successfully!",
              });
            }
          }
        } else {
          // Normal session fetch if not from email confirmation
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error fetching session:', error);
            throw error;
          }
          
          if (session) {
            setSession(session);
            setUser(session.user);
            console.log('Restored session for user:', session.user.email);
          }
        }
      } catch (error) {
        console.error('Session restoration error:', error);
        toast({
          title: "Authentication error",
          description: "There was a problem with your authentication status",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', currentSession?.user?.email);
          
          // Check if user has a confirmed email
          if (currentSession?.user?.email_confirmed_at) {
            // Email is confirmed - clear pending confirmation and navigate to profile setup
            localStorage.removeItem('pendingConfirmationEmail');
            
            // Only navigate to profile setup if we're not already there or on a deeper path
            if (location.pathname !== '/profile/setup' && !location.pathname.startsWith('/dashboard')) {
              navigate('/profile/setup');
            }
          } else if (localStorage.getItem('pendingConfirmationEmail')) {
            // If email is not confirmed and we have a pending confirmation
            // Always navigate to confirmation page
            navigate('/email-confirmation');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          navigate('/');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated');
          
          // Check if email was just confirmed
          if (currentSession?.user?.email_confirmed_at && localStorage.getItem('pendingConfirmationEmail')) {
            toast({
              title: "Email confirmed",
              description: "Your email has been confirmed successfully!",
            });
            localStorage.removeItem('pendingConfirmationEmail');
            navigate('/profile/setup');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast, navigate, location.pathname]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Successfully signed in",
        description: "Welcome back!",
      });
      
      // Navigation will be handled by the auth state change listener
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, metadata?: Record<string, string>) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: metadata || {}
        }
      });

      if (error) throw error;
      
      toast({
        title: "Confirmation Link Sent",
        description: "Please continue the sign-up process by following the confirmation link sent to your email.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
