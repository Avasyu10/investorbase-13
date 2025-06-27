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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.email);
        
        // Handle different auth events
        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          console.log('User signed in:', currentSession.user.email);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          console.log('User signed out - clearing state');
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          console.log('Session token refreshed successfully');
        } else if (event === 'USER_UPDATED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          console.log('User updated');
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery event - keep any existing session
          console.log('Password recovery event detected');
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any stale session data
          setSession(null);
          setUser(null);
        } else if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          console.log('Restored session for user:', existingSession.user.email);
        } else {
          console.log('No existing session found');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string, userType?: 'founder' | 'accelerator' | 'vc') => {
    try {
      setIsLoading(true);
      
      // First, authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      
      if (!userId) {
        throw new Error('Authentication failed - no user ID received');
      }

      // Check user's signup source for access control
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('signup_source')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user profile:', profileError);
        // Don't block signin for profile check errors, just log them
      }

      console.log('User profile data:', profileData);
      console.log('Attempting signin with userType:', userType);

      // SIMPLE ACCESS CONTROL: Only block founder_signup users from accelerator/VC sections
      if ((userType === 'accelerator' || userType === 'vc') && 
          profileData && 
          profileData.signup_source === 'founder_signup') {
        // Block founder_signup users from institutional signin
        console.log('Blocking founder_signup user from accessing institutional signin');
        await supabase.auth.signOut();
        throw new Error('Access denied. Founders cannot use institutional signin. Please use the founder signin option.');
      }
      
      toast({
        title: "Successfully signed in",
        description: "Welcome back!",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
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
      console.error('Sign up error:', error);
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
      console.log('Starting sign out process...');
      setIsLoading(true);
      
      // Clear local state first to provide immediate feedback
      setSession(null);
      setUser(null);
      
      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        // Even if there's an error, we've cleared local state
        // This handles cases where the session might be stale
      }
      
      console.log('Sign out completed, navigating to home...');
      
      // Navigate to home page
      navigate('/');
      
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      console.error('Error during sign out process:', error);
      
      // Still clear local state and redirect even if there's an error
      setSession(null);
      setUser(null);
      navigate('/');
      
      toast({
        title: "Signed out",
        description: "You've been signed out.",
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
      console.error('Password reset error:', error);
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
      
      return true;
    } catch (error: any) {
      console.error('Password update error:', error);
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
