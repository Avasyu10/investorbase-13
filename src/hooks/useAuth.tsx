
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string, userType?: 'founder' | 'accelerator' | 'vc') => Promise<void>;
  signUpWithEmail: (email: string, password: string, metadata?: Record<string, string>) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
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
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const signInWithEmail = async (email: string, password: string, userType?: 'founder' | 'accelerator' | 'vc') => {
    try {
      setIsLoading(true);
      
      // First, authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // If this is a restricted signin (accelerator/vc), check user signup source
      if (userType && (userType === 'accelerator' || userType === 'vc')) {
        const userId = authData.user?.id;
        
        if (userId) {
          // Check if user has a profile with founder_signup source
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('signup_source')
            .eq('id', userId)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error checking user profile:', profileError);
            throw new Error('Authentication verification failed');
          }

          // If user has a profile with founder_signup source, they shouldn't access institutional signin
          if (profileData && profileData.signup_source === 'founder_signup') {
            // Sign out the user immediately
            await supabase.auth.signOut();
            throw new Error('Access denied. Founders cannot use institutional signin. Please use the founder signin option.');
          }
        }
      }
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, metadata?: Record<string, string>) => {
    try {
      setIsLoading(true);
      
      // Add signup_source to metadata for founder signups
      const signupMetadata = {
        ...metadata,
        signup_source: 'founder_signup'
      };
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: signupMetadata
        }
      });

      if (error) throw error;
      
      const checkRedirectNeeded = async () => {
        try {
          const { data, error: profileError } = await supabase
            .from('vc_profiles')
            .select('id')
            .eq('id', user?.id)
            .maybeSingle();
            
          if (profileError || !data) {
            navigate('/profile/setup');
          }
        } catch (err) {
          console.error("Error checking profile:", err);
        }
      };
      
      setTimeout(checkRedirectNeeded, 1000);
      
      toast({
        title: "Confirmation Link Sent",
        description: "You can continue the Sign Up process from the confirmation link.",
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

  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for the password reset link.",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
      
      navigate('/');
      return true;
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
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
        resetPassword,
        updatePassword,
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
