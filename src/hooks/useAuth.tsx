import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
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
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error);
          throw error;
        }
        
        if (session) {
          setSession(session);
          setUser(session.user);
          console.log('Restored session for user:', session.user.email);
        } else {
          // Clear any stale user/session state
          setSession(null);
          setUser(null);
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Session restoration error:', error);
        // Clear auth state on error
        setSession(null);
        setUser(null);
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
        console.log('Auth state changed:', event, currentSession?.user?.email);
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', currentSession?.user?.email);
          
          const returnTo = location.state?.from || '/dashboard';
          console.log('Redirecting to:', returnTo);
          navigate(returnTo, { replace: true });
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          navigate('/');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast, navigate, location]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Login successful but no user returned");
      }
      
      setUser(data.user);
      setSession(data.session);
      
      toast({
        title: "Successfully signed in",
        description: "Welcome back!",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error; // Rethrow to allow the caller to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;
      
      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
      }
      
      toast({
        title: "Sign up successful",
        description: "Please check your email for the confirmation link.",
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
      setUser(null);
      setSession(null);
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
