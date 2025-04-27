import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { createClient } from '@/util/supabase/component';
import { User, Provider } from '@supabase/supabase-js';
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/router';
import { info, error as logError, debug } from '@/util/logger';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  createUser: (user: User) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initializing: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  createUser: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  signInWithMagicLink: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  initializing: false
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  React.useEffect(() => {
    let isMounted = true;
    let createUserPromise: Promise<any> | null = null;

    const fetchSession = async () => {
      try {
        // Add a timeout to prevent hanging on auth requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth request timed out after 10 seconds')), 10000);
        });
        
        // Race between the actual request and the timeout
        const authResult = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise
        ]) as { data: { user: User | null }, error: Error | null };
        
        const { data: { user }, error: fetchError } = authResult;
        
        if (fetchError) {
          logError('Error fetching user session', 'auth', fetchError);
          if (isMounted) setInitializing(false);
          return;
        }
        
        if (isMounted) setUser(user);
        
        // If user exists, ensure they are created in the database
        if (user && isMounted) {
          try {
            // Use a single promise to prevent duplicate calls
            if (!createUserPromise) {
              createUserPromise = createUser(user);
            }
            await createUserPromise;
          } catch (err) {
            logError('Error creating user during session fetch', 'auth', err);
          } finally {
            createUserPromise = null;
          }
        }
        
        if (isMounted) setInitializing(false);
      } catch (err) {
        logError('Unexpected error during session fetch', 'auth', err);
        // If there's an error, we still want to allow the app to function
        // by setting initializing to false and user to null
        if (isMounted) {
          setInitializing(false);
          setUser(null);
        }
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug(`Auth state changed: ${event}`, 'auth');
      
      const currentUser = session?.user ?? null;
      if (isMounted) setUser(currentUser);
      
      // If user signs in or token is refreshed, ensure they are created in the database
      if (currentUser && isMounted && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          // Use a single promise to prevent duplicate calls
          if (!createUserPromise) {
            createUserPromise = createUser(currentUser);
          }
          await createUserPromise;
        } catch (err) {
          logError(`Error creating user during auth state change (${event})`, 'auth', err);
        } finally {
          createUserPromise = null;
        }
      }
      
      if (isMounted) setInitializing(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      debug('Fetching user role for: ' + userId, 'auth');
      
      const response = await fetch(`/api/auth/user-role?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        logError('Fetch user role API error', 'auth', errorData);
        return null;
      }

      const data = await response.json();
      debug('User role fetched successfully', 'auth');
      setUserRole(data.role);
      
      // Set a cookie with the user's role for middleware use
      document.cookie = `user_role=${data.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      
      return data.role;
    } catch (error: any) {
      logError('Fetch user role error', 'auth', error);
      return null;
    }
  };

  const createUser = async (user: User) => {
    try {
      debug('Creating user profile for: ' + user.id, 'auth');
      
      if (!user.id || !user.email) {
        logError('Invalid user data for createUser', 'auth', { id: user.id, email: user.email });
        throw new Error('Invalid user data: missing ID or email');
      }
      
      // More robust caching with localStorage
      // Check if we've already created this user in this session (more persistent than sessionStorage)
      const cacheKey = `user_profile_created_${user.id}`;
      const cacheTimeKey = `user_profile_created_time_${user.id}`;
      
      try {
        // Check if we've created this user in the last 24 hours
        const cachedTime = localStorage.getItem(cacheTimeKey);
        if (cachedTime) {
          const timestamp = parseInt(cachedTime, 10);
          const now = Date.now();
          const hoursSinceCreation = (now - timestamp) / (1000 * 60 * 60);
          
          // If we've created this user in the last 24 hours, skip the API call
          if (hoursSinceCreation < 24) {
            debug(`User was created less than 24 hours ago (${hoursSinceCreation.toFixed(2)} hours). Skipping create API call.`, 'auth');
            return JSON.parse(localStorage.getItem(cacheKey) || '{}');
          }
        }
      } catch (e) {
        // If localStorage access fails, continue with the API call
        debug('Failed to check user creation cache', 'auth');
      }
      
      // Add retry logic for potential network issues
      let retries = 5; // Increased from 3 to 5 for more resilience
      let response;
      let lastError;
      
      // Get the base URL from environment or default to current origin
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || '';
      
      const apiUrl = `${baseUrl}/api/auth/create-user`;
      debug(`Using API URL: ${apiUrl}`, 'auth');
      
      while (retries > 0) {
        try {
          debug(`Attempting to create user (attempt ${6 - retries}/5)`, 'auth');
          
          // Add timeout to the fetch request with increased timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            debug('Aborting fetch due to timeout', 'auth');
            controller.abort();
          }, 20000); // 20 second timeout (increased from 12)
          
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
            }),
            credentials: 'include', // Include cookies in the request
            mode: 'cors', // Explicitly set CORS mode
            signal: controller.signal,
            // Prevent caching
            cache: 'no-store'
          });
          
          clearTimeout(timeoutId);
          
          // If successful, break out of retry loop
          debug(`Received response with status: ${response.status}`, 'auth');
          
          // If we get a 503 (service unavailable) or 504 (gateway timeout), retry
          if (response.status === 503 || response.status === 504) {
            const errorData = await response.json();
            throw new Error(`Server timeout (${response.status}): ${errorData.message || 'Database connection issue'}`);
          }
          
          break;
        } catch (err: any) {
          lastError = err;
          
          // Check if this was an abort error (timeout)
          if (err.name === 'AbortError') {
            logError(`Create user API timeout (retries left: ${retries - 1}):`, 'auth', err);
          } else {
            logError(`Create user API network error (retries left: ${retries - 1}):`, 'auth', err);
          }
          
          retries--;
          
          // Wait before retrying (exponential backoff with longer initial delay)
          if (retries > 0) {
            // Start with a longer delay (3 seconds) and increase exponentially
            const backoffTime = 3000 * Math.pow(2, 5 - retries); 
            debug(`Retrying in ${backoffTime}ms`, 'auth');
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }
      }
      
      // If response is successful
      if (response && response.ok) {
        debug('Create user API request successful', 'auth');
        const userData = await response.json();
        
        // Cache the user creation status and timestamp
        try {
          localStorage.setItem(cacheKey, JSON.stringify(userData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          debug('Failed to cache user creation data', 'auth');
        }
        
        // Fetch user role since we have a successful response
        await fetchUserRole(user.id);
        return userData;
      }
      
      // If all retries failed, return a fallback user with ADMIN role
      logError('All create user API attempts failed or returned error', 'auth', lastError);
      
      const fallbackUser = { 
        id: user.id,
        email: user.email,
        role: 'ADMIN',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        isError: true,
      };
      
      setUserRole('ADMIN');
      return fallbackUser;
    } catch (error: any) {
      logError('Create user error', 'auth', error);
      return {
        id: user.id,
        email: user.email,
        role: 'ADMIN',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        isError: true,
      };
    } finally {
      setInitializing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      await createUser(data.user);
    }
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    } else {
      toast({
        title: "Success",
        description: "You have successfully signed in",
      });
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (data.user) {
      await createUser(data.user);
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    } else {
      toast({
        title: "Success",
        description: "Sign up successful! Please login to continue.",
      });
    }
  };

  const signInWithMagicLink = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (!error && data.user) {
      await createUser(data.user);
    }
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    } else {
      toast({
        title: "Success",
        description: "Check your email for the login link",
      });
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google' as Provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    // Clear the user_role cookie
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "You have successfully signed out",
      });
      router.push('/');
    }
  };

  const resetPassword = async (email: string) => {
    debug(`Requesting password reset for: ${email}`, 'auth');
    
    // Get the base URL from environment or default to current origin
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || '';
    
    const redirectUrl = `${baseUrl}/reset-password`;
    debug(`Using redirect URL: ${redirectUrl}`, 'auth');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    if (error) {
      logError('Password reset request error:', 'auth', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    } else {
      debug('Password reset email sent successfully', 'auth');
      toast({
        title: "Success",
        description: "Check your email for the password reset link",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      createUser,
      signIn,
      signUp,
      signInWithMagicLink,
      signInWithGoogle,
      signOut,
      resetPassword,
      initializing,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);