
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "sonner";

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
  const isProcessingRef = useRef<boolean>(false);

  const updateAuthState = (newSession: Session | null) => {
    const sessionChanged = (!!newSession) !== (!!session);
    const userChanged = (!!newSession?.user) !== (!!user);
    
    if (sessionChanged || userChanged) {
      console.log('Auth state updated:', newSession?.user?.email);
      setSession(newSession);
      setUser(newSession?.user || null);
    }
  };

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
          updateAuthState(session);
          console.log('Restored session for user:', session.user.email);
        } else {
          updateAuthState(null);
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Session restoration error:', error);
        updateAuthState(null);
        toast.error("Authentication error", {
          description: "There was a problem with your authentication status"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email);
        
        updateAuthState(currentSession);
        setIsLoading(false);
        
        // Don't redirect if in an upload or processing operation
        if (isProcessingRef.current) {
          console.log('Processing in progress, skipping auth-related redirect');
          return;
        }
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', currentSession?.user?.email);
          
          const currentPath = location.pathname;
          if (currentPath === '/upload') {
            console.log('Already on upload page, not redirecting');
            return;
          }
          
          // Don't redirect if we're on the login page and the user intended to go to /upload
          if (currentPath === '/login' && location.state?.from === '/upload') {
            console.log('Redirecting to upload page after login');
            navigate('/upload', { replace: true });
            return;
          }
          
          const returnTo = location.state?.from || '/dashboard';
          console.log('Redirecting to:', returnTo);
          navigate(returnTo, { replace: true });
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          navigate('/', { replace: true });
        }
      }
    );

    // Check URL for processing indicator
    if (location.pathname === '/upload') {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('processing') === 'true') {
        isProcessingRef.current = true;
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

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
      
      toast.success("Successfully signed in", {
        description: "Welcome back!"
      });
    } catch (error: any) {
      toast.error("Sign in failed", {
        description: error.message
      });
      throw error;
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
      
      toast.success("Sign up successful", {
        description: "Please check your email for the confirmation link."
      });
      
      return true;
    } catch (error: any) {
      toast.error("Sign up failed", {
        description: error.message
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
      toast.success("Signed out", {
        description: "You've been successfully signed out."
      });
    } catch (error: any) {
      toast.error("Error signing out", {
        description: error.message
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
